#!/usr/bin/env python3
"""Read-only TECH-09 audit. Python 3 stdlib; no credentials or form submissions.

python3 scripts/verify-url-routing.py --output /tmp/nextcw-routing.json
python3 scripts/verify-url-routing.py --extra-url-file /tmp/gsc-urls.txt
The optional file contains one affected NEXT COWORK URL per line (not a CSV).
External 200 responses prove HTTP reachability only, not rendered Notion content.
"""
import argparse
import concurrent.futures
import datetime
import json
from pathlib import Path
from html.parser import HTMLParser
from urllib import error, parse, request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = 'https://www.nextcw.com'
REDIRECTS = {301, 302, 303, 307, 308}


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals, self.robots = [], []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'link' and 'canonical' in attrs.get('rel', '').lower().split():
            self.canonicals.append(attrs.get('href'))
        if tag == 'meta' and attrs.get('name', '').lower() in {'robots', 'googlebot'}:
            self.robots.append(attrs.get('content', ''))


def trace(url):
    initial, chain, seen = url, [], set()
    try:
        for _ in range(11):
            if url in seen:
                raise ValueError('redirect loop')
            seen.add(url)
            if parse.urlsplit(url).scheme not in {'http', 'https'}:
                raise ValueError('invalid redirect scheme')
            req = request.Request(url, headers={'User-Agent': 'NEXTCOWORK-URL-Audit/1.0'})
            try:
                res = request.build_opener(NoRedirect).open(req, timeout=20)
            except error.HTTPError as exc:
                res = exc
            with res:
                body = res.read(3_000_000).decode('utf-8', errors='replace')
                headers = {k.lower(): v for k, v in res.headers.items()}
                step = {'url': url, 'status': res.code}
                for key in ['location', 'content-type', 'x-robots-tag']:
                    if key in headers:
                        step[key] = headers[key]
                chain.append(step)
            if step['status'] not in REDIRECTS:
                meta = Metadata()
                meta.feed(body)
                return {'requested': initial, 'chain': chain, 'final': url,
                        'canonical': meta.canonicals, 'robots': meta.robots,
                        'error': None}, body
            if not headers.get('location'):
                raise ValueError('empty redirect Location')
            if len(chain) > 10:
                raise ValueError('more than 10 redirects')
            url = parse.urljoin(url, headers['location'])
    except Exception as exc:
        return {'requested': initial, 'chain': chain, 'final': url, 'error': str(exc)}, ''


def audit(extra_urls=()):
    sitemap_result, sitemap_body = trace(ORIGIN + '/sitemap.xml')
    if sitemap_result['error'] or sitemap_result['chain'][-1]['status'] != 200:
        raise RuntimeError('live sitemap unavailable: ' + json.dumps(sitemap_result))
    locations = [node.text for node in ET.fromstring(sitemap_body).iter()
                 if node.tag == '{http://www.sitemaps.org/schemas/sitemap/0.9}loc']
    jobs = [(url, url, 200, True, 'sitemap') for url in locations]
    config = json.loads((ROOT / 'vercel.json').read_text())
    for rule in config['redirects']:
        if rule['source'].startswith('/:'):
            continue
        jobs.append((ORIGIN + rule['source'], parse.urljoin(ORIGIN, rule['destination']),
                     200, False, 'legacy'))
    # Known archive ID from README, with/without hyphens and trailing slash.
    for identifier in ['12f87cb032f88076b330cb6cc049d3ed',
                       '12f87cb0-32f8-8076-b330-cb6cc049d3ed']:
        for suffix in ['', '/']:
            jobs.append((ORIGIN + '/' + identifier + suffix, ORIGIN + '/insights/',
                         200, False, 'legacy-pattern-sample'))
    for domain in ['http://nextcw.com', 'http://www.nextcw.com',
                   'https://nextcw.com', ORIGIN]:
        for path, target in [('/', '/'), ('/flexoffice/', '/flexoffice/'),
                             ('/space_consulting/', '/flexoffice/'),
                             ('/space_consulting', '/flexoffice/')]:
            jobs.append((domain + path, ORIGIN + target, 200, False, 'domain'))
    for path in ['/robots.txt', '/rss.xml']:
        jobs.append((ORIGIN + path, ORIGIN + path, 200, True, 'discovery'))
    for path in ['/tech-09-missing-20261016/', '/insights/tech-09-missing-20261016/']:
        jobs.append((ORIGIN + path, ORIGIN + path, 404, True, 'missing-page'))
    for path, canonical in [('/index.html', '/'), ('/flexoffice/index.html', '/flexoffice/')]:
        jobs.append((ORIGIN + path, ORIGIN + path, 200, True, 'html-alias'))
    for url in extra_urls:
        if parse.urlsplit(url).hostname not in {'nextcw.com', 'www.nextcw.com'}:
            raise ValueError('extra URL must belong to nextcw.com: ' + url)
        jobs.append((url, None, None, False, 'gsc-extra'))
    # Multiple expectations for the same URL are intentionally retained.
    def check(job):
        url, target, status, direct, kind = job
        result, _ = trace(url)
        issues = []
        final_status = result['chain'][-1]['status'] if result['chain'] else None
        if result['error']:
            issues.append(result['error'])
        if status is not None and final_status != status:
            issues.append(f'expected HTTP {status}, got {final_status}')
        if target is not None and result['final'] != target:
            issues.append('unexpected final URL')
        if direct and len(result['chain']) != 1:
            issues.append('unexpected redirect')
        if kind == 'sitemap':
            if not url.startswith(ORIGIN + '/') or result.get('canonical') != [url]:
                issues.append('sitemap/canonical mismatch')
            robot_values = result.get('robots', []) + [s.get('x-robots-tag', '') for s in result['chain']]
            if any('noindex' in value.lower() for value in robot_values):
                issues.append('sitemap URL is noindex')
        if kind == 'gsc-extra' and final_status != 200:
            issues.append('GSC URL requires review (non-200 destination)')
        result.update(kind=kind, issues=issues)
        return result
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(check, jobs))
    return {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'scope': 'public HTTP snapshot; not Googlebot or Google index verification',
            'sitemapUrls': len(locations), 'checks': len(results),
            'uniqueUrls': len({r['requested'] for r in results}),
            'failures': sum(bool(r['issues']) for r in results), 'results': results}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--extra-url-file', type=Path)
    args = parser.parse_args()
    extra = [line.strip() for line in args.extra_url_file.read_text().splitlines()
             if line.strip()] if args.extra_url_file else []
    report = audit(extra)
    if args.output:
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'results'}, ensure_ascii=False))
    for row in report['results']:
        if row['issues']:
            print(json.dumps(row, ensure_ascii=False))
    raise SystemExit(bool(report['failures']))
