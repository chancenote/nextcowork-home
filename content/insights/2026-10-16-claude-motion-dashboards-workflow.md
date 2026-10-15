---
title: "Claude Dashboards와 Motion, 업무에서는 어떻게 이어 쓸까?"
description: "Claude의 새 기능 Dashboards는 데이터를 판단할 화면으로, Motion은 자료를 짧은 설명 애니메이션으로 바꿉니다. 두 기능의 차이, 플랜별 사용 가능 여부, 숫자를 믿기 전에 확인할 기준, 교육·공간·세일즈 업무에 적용하는 첫 실험을 카드뉴스 10장으로 정리했습니다."
date: "2026-10-16"
category: "AI 실무활용"
topic: "AI 업무전환"
tags: ["Claude", "Claude Dashboards", "Claude Motion", "데이터 시각화", "업무 흐름"]
slug: "claude-motion-dashboards-workflow"
image: "/img/insights/claude-motion-dashboards-workflow/hero.webp"
thumbnail: "/img/insights/claude-motion-dashboards-workflow/hero.webp"
image_alt: "Claude Dashboards와 Motion 카드뉴스 표지·기능 비교·대시보드 예시 카드 세 장을 나란히 놓은 이미지"
cta_service: "ai-campus"
audience: "보고·교육·영업 자료를 만들며 데이터와 설명을 함께 다루는 실무 책임자와 교육 담당자"
takeaway: "두 기능의 역할 구분, 플랜별 사용 가능 표, 숫자 확인 체크리스트 3단계, 바로 쓰는 요청문 2개"
author: "이종찬"
---

Dashboards는 데이터를 보고 판단하는 화면을, Motion은 그 판단을 다른 사람에게 설명하는 짧은 애니메이션을 만듭니다.

Anthropic은 2026년 10월 8일 Claude에 두 기능을 베타로 추가했습니다. 연결한 데이터에 질문하면 차트가 담긴 대시보드가 만들어지고, 보고서나 자료를 주면 설명용 애니메이션이 만들어집니다. [Anthropic 발표](https://claude.com/resources/articles/dashboards-and-motion)

새 기능 소식이 나오면 “무엇을 할 수 있나”보다 “내 업무 어디에 끼우나”가 더 궁금합니다. 이 글은 두 기능을 하나의 흐름으로 묶어 봅니다. **숫자를 보고(Dashboards), 그 이야기를 움직여 전달한다(Motion).** 끝에는 플랜별 사용 가능 여부와 바로 붙여 쓸 요청문 두 개를 정리했습니다.

![카드뉴스 표지. 숫자를 보고, 이야기를 움직입니다라는 제목 아래 Dashboards는 데이터에서 판단으로, Motion은 자료에서 설명으로 이어진다는 두 개의 카드가 놓여 있다](/img/insights/claude-motion-dashboards-workflow/card-01.webp "Dashboards는 데이터 → 판단, Motion은 자료 → 설명을 돕습니다.")

카드뉴스 10장은 넥스트코웍이 공식 안내를 바탕으로 독립 제작한 기능 소개입니다. 카드 속 도표는 개념도와 예시 데이터이며, 실제 제품 화면이나 고객 성과가 아닙니다.

## 두 기능은 무엇이 다를까?

Dashboards는 “무엇이 달라졌지?”에, Motion은 “어떻게 설명할까?”에 답합니다.

같은 분기 자료라도 목적에 따라 필요한 결과물이 다릅니다. 내가 상황을 파악하려면 비교와 추이를 볼 수 있는 화면이 필요하고, 팀이나 고객에게 전하려면 핵심 메시지 서너 개를 순서대로 보여주는 설명이 필요합니다.

![대시보드는 판단을, 모션은 전달을 돕는다는 카드. Dashboards는 연결한 데이터에 질문하고 차트로 살펴보며, Motion은 자료 속 핵심 메시지를 짧은 애니메이션으로 만든다고 비교한다](/img/insights/claude-motion-dashboards-workflow/card-02.webp "분석에서 찾은 내용을 설명 애니메이션의 소재로 이어 쓸 수 있습니다.")

| 구분 | Dashboards | Motion |
|---|---|---|
| 답하는 질문 | 무엇이 달라졌나 | 어떻게 설명할까 |
| 입력 | 연결한 데이터 웨어하우스·앱 | 보고서·차트·제품 자료와 요청 |
| 결과물 | 차트가 담긴 대시보드 | 짧은 애니메이션(MP4 내려받기) |
| 고치는 방법 | 대화로 필터 추가·쿼리 확인 | 대화 또는 편집기에서 문구·숫자·타이밍 수정 |
| 처음 공개 범위 | 나만 보기, 공유는 직접 | 나만 보기, 공유는 직접 |

## Motion은 보고서를 어떻게 영상으로 바꿀까?

보고 내용과 대상, 길이를 알려주면 Claude가 장면을 나눈 설명 애니메이션을 코드로 만듭니다.

예를 들어 분기 보고서를 주고 “문제 제시 → 변화 설명 → 다음 행동” 세 장면으로 만들어 달라고 요청할 수 있습니다. 결과는 짧은 영상처럼 재생되고 MP4 파일로 내려받을 수 있습니다. [Motion 시작 안내](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion)

![보고서가 짧은 영상이 된다는 카드. 분기 보고서·차트·제품 자료를 입력하면 문제 제시, 변화 설명, 다음 행동 세 장면으로 나뉜다](/img/insights/claude-motion-dashboards-workflow/card-03.webp "장면 구성은 활용 예시입니다.")

애니메이션이 코드로 만들어진다는 점이 실무에서 중요합니다. 숫자 하나나 장면 타이밍 하나를 바꿔도 나머지는 그대로 남습니다. “두 번째 장면을 조금 천천히 보여줘”처럼 말로 고치거나 편집기에서 직접 손볼 수 있습니다.

![바꾸고 싶은 부분을 말로 고친다는 카드. 두 번째 장면을 조금 천천히 보여줘라는 수정 요청 예시와 도입, 핵심 설명, 마무리 세 장면이 나란히 있다](/img/insights/claude-motion-dashboards-workflow/card-04.webp "문구·숫자·장면 타이밍을 대화나 편집기에서 수정합니다.")

움직이는 대상은 텍스트·차트·도형·이미지입니다. Motion은 영상 생성 모델을 쓰지 않기 때문에 사실적인 촬영 장면이나 AI가 만든 인물은 나오지 않습니다. 홍보 영상보다는 **보고·교육·제품 설명**처럼 내용을 정확히 전해야 하는 자리에 맞습니다.

![텍스트와 도표를 코드로 움직인다는 카드. 텍스트, 차트, 도형, 이미지 네 가지 요소와 완성한 애니메이션을 MP4 영상 파일로 내려받는다는 안내가 있다](/img/insights/claude-motion-dashboards-workflow/card-05.webp "사실적인 인물·촬영 영상을 생성하는 기능은 아닙니다.")

## Dashboards는 어떤 데이터에 질문할 수 있을까?

Amazon Redshift, BigQuery, ClickHouse, Databricks, Snowflake 같은 데이터 웨어하우스와 Salesforce처럼 Claude에 연결한 앱의 데이터에 질문할 수 있습니다.

“이번 달 채널별 실적을 지난달과 비교해줘”라고 물으면 Claude가 쿼리를 작성하고 차트로 보여줍니다. 필터를 추가하거나 차트를 바꾸는 것도 대화로 요청합니다. [Dashboards 시작 안내](https://support.claude.com/en/articles/17454700-get-started-with-claude-dashboards)

![질문하면 데이터가 화면이 된다는 카드. BigQuery, Snowflake, Salesforce 연결 예시와 이번 달 채널별 실적을 지난달과 비교해줘라는 질문, 채널 A·B·C의 지난달과 이번 달 막대 비교 개념도가 있다](/img/insights/claude-motion-dashboards-workflow/card-06.webp "개념도·예시 데이터입니다. 실제 연동은 데이터 접근 권한과 조직 설정에 따릅니다.")

공식 안내는 Dashboards를 빠른 탐색용 질문에 쓰고, 더 깊은 분석은 다른 도구로 옮기라고 설명합니다. 첫 화면을 빨리 보는 도구로 이해하면 기대치를 맞추기 쉽습니다.

## 대시보드 숫자는 믿어도 될까?

차트마다 Claude가 작성한 쿼리와 마지막 갱신 시점을 확인할 수 있으니, 중요한 판단 전에는 그 두 가지를 먼저 봅니다.

AI가 만든 차트는 보기 좋을수록 의심 없이 받아들이기 쉽습니다. 그런데 매출에 취소·환불이 포함됐는지, 비교 기간이 같은지에 따라 같은 질문도 다른 숫자가 나옵니다. 넥스트코웍이 제안하는 확인 순서는 세 단계입니다.

| 단계 | 확인할 질문 | 보는 곳 |
|---|---|---|
| 1 | 무엇을 집계했나요? (매출·취소·환불 포함 기준) | 차트의 쿼리 |
| 2 | 어느 기간의 숫자인가요? (집계 기간·비교 조건) | 차트의 쿼리 |
| 3 | 언제 갱신됐나요? | 차트의 마지막 갱신 시점 |

![숫자 뒤의 기준까지 확인할 수 있다는 카드. 무엇을 집계했나요, 어느 기간의 숫자인가요, 언제 갱신됐나요 세 가지 질문이 번호와 함께 있고 빠르게 탐색하고 중요한 판단 전에는 기준을 검토하라고 정리한다](/img/insights/claude-motion-dashboards-workflow/card-07.webp "체크리스트는 넥스트코웍의 실무 활용 제안입니다.")

## 우리 업무에서는 어디부터 시작할까?

질문 하나와 원천 데이터 하나로 작은 실험부터 시작합니다. Dashboards로 살펴보고, 찾은 내용을 Motion으로 전달하는 순서입니다.

| 업무 | Dashboards로 볼 것 | Motion으로 전할 것 |
|---|---|---|
| 교육 운영 | 모집 채널별 신청 흐름 | 운영 보고 30초 요약 |
| 공간 운영 | 기간별 입주·이용 현황 | 이해관계자용 현황 설명 |
| 세일즈 | 상담 단계별 기회 | 팀 주간 브리핑 |

![우리 업무에서는 이렇게 시작해 보라는 카드. 교육 운영은 모집 채널별 신청 흐름에서 운영 보고로, 공간 운영은 기간별 입주·이용 현황에서 현황 설명으로, 세일즈는 상담 단계별 기회에서 팀 브리핑으로 이어진다](/img/insights/claude-motion-dashboards-workflow/card-08.webp "활용 제안입니다. 연결 가능한 소스와 필요한 데이터가 전제입니다.")

세 가지 모두 넥스트코웍의 제안이며, 실제로 하려면 해당 데이터가 Claude에 연결 가능한 곳에 있어야 합니다. 데이터가 엑셀 파일에 흩어져 있다면 대시보드보다 데이터 위치를 정리하는 일이 먼저입니다. 이런 순서를 팀과 함께 잡는 과정은 [AI Campus 기업 교육](/ai-campus/)의 실습 과제로 다룹니다.

## 내 플랜에서 쓸 수 있을까?

Dashboards는 Pro·Max·Team·Enterprise에서, Motion은 Team·Enterprise에서 베타로 제공되며 Free 플랜에서는 둘 다 쓸 수 없습니다.

| 플랜 | Dashboards | Motion |
|---|---|---|
| Free | 미제공 | 미제공 |
| Pro · Max | 제공(베타) | 미제공 |
| Team | 제공(베타) | 제공(베타) |
| Enterprise | 제공(베타)·관리자 활성화 필요 | 제공(베타)·관리자 활성화 필요 |

![내 플랜에서 쓸 수 있는지 확인하라는 카드. Free는 둘 다 미제공, Pro·Max는 Dashboards만 제공, Team은 둘 다 제공, Enterprise는 둘 다 제공이지만 기본 비활성화라 조직 관리자가 켜야 한다는 표](/img/insights/claude-motion-dashboards-workflow/card-09.webp "2026.10.15 공식 안내 기준 · 플랜 사용량 한도 적용")

Enterprise는 기본으로 꺼져 있어 조직 소유자가 Organization settings > Artifacts에서 켜야 하고, 특정 그룹에만 열어 둘 수도 있습니다. 두 기능 모두 플랜 사용량 한도에 포함되며, 길고 복잡한 애니메이션일수록 한도를 더 씁니다. 베타 기능이므로 제공 범위는 바뀔 수 있으니 도입 전에 공식 안내를 다시 확인하세요.

## 자주 묻는 질문

### Claude Motion으로 홍보 영상을 만들 수 있나요

실사 촬영이나 인물이 나오는 홍보 영상은 만들 수 없습니다. Motion은 영상 생성 모델이 아니라 텍스트·차트·도형·이미지를 코드로 움직이는 방식이라, 보고·교육·제품 설명 같은 설명형 애니메이션에 맞습니다.

### 엑셀 파일만 있어도 Dashboards를 쓸 수 있나요

공식 안내가 예로 드는 연결 대상은 Redshift, BigQuery, ClickHouse, Databricks, Snowflake 같은 데이터 웨어하우스와 Salesforce처럼 Claude에 연결한 앱입니다. 지금 쓰는 데이터가 어디에 있고 연결할 수 있는지부터 확인하는 것이 순서입니다.

### 만든 대시보드나 애니메이션은 바로 다른 사람에게 보이나요

아닙니다. 둘 다 처음에는 만든 사람에게만 보이고, 공유 버튼으로 직접 공유해야 다른 사람이 볼 수 있습니다.

## 다음 액션

오늘 만들 보고나 설명 하나를 골라 작은 실습으로 바꿔 보세요. 아래 두 요청문을 그대로 붙여 넣고 데이터와 자료만 바꾸면 됩니다.

> Dashboards: “연결한 영업 데이터로 이번 달 상담 단계를 비교하고, 집계 기준과 갱신 시점을 보여줘.”

> Motion: “첨부 보고서를 바탕으로 고객용 30초 설명 영상을 만들어줘. 핵심 메시지는 3개로 정리해줘.”

![자료 하나로 첫 결과물을 만들라는 마지막 카드. Dashboards와 Motion 요청 예시 두 개와 AI 교육·AX 적용 상담 버튼이 있다](/img/insights/claude-motion-dashboards-workflow/card-10.webp "이 콘텐츠는 NEXT COWORK의 독립적인 기능 소개입니다.")

10장 전체를 순서대로 넘겨 보거나 팀에 공유하려면 [움직이는 카드뉴스로 보기](/img/insights/claude-motion-dashboards-workflow/cardnews.html)를 열어 보세요. 자동 재생·이전/다음·키보드 이동을 지원합니다. 카드뉴스의 모션은 넥스트코웍이 별도로 제작한 것으로, Claude Motion의 실행 결과가 아닙니다.

새 기능을 팀 업무 흐름에 맞게 정리하는 일은 [AI Campus](/ai-campus/) 교육과 [CEO AI 코칭](/coaching/)에서 함께 합니다. 화면을 오가며 자료를 모으는 흐름이 궁금하다면 [Aside Browser 업무 흐름 글](/insights/aside-browser-workflow/)도 이어서 읽어 보세요.

참고한 공식 자료: [Anthropic 발표 — Dashboards and Motion](https://claude.com/resources/articles/dashboards-and-motion) · [Claude Motion 시작 안내](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion) · [Claude Dashboards 시작 안내](https://support.claude.com/en/articles/17454700-get-started-with-claude-dashboards) (2026년 10월 16일 확인)
