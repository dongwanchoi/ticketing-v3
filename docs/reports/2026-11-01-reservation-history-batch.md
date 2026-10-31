# Reservation history IN 일괄 조회 개선 및 검증

작성: 2026-11-01 KST. 기준 원격 dev: 94a966f703d45113da2881cf7e16fb6069034262. 작업 브랜치 perf/history-batch-in.

## 최종 판단: 부분 성공

정확성 및 N+1 제거는 성공했다. 동일 데이터 비교에서 10건·100건 평균/p50/p95가 개선됐다. 1건 평균은 감소했지만 p95는 악화했으며 표본·JIT·측정 순서의 한계로 모든 조건의 지연 개선이나 운영 SLA는 입증하지 않는다. SQL 수 감소만을 성능 성공 근거로 삼지 않았다.

## 기존 원인과 변경

기존 history()는 목록 SELECT1회 후 row마다 labels(holdId)를 실행하는 명시적 JDBC N+1이었다. 목록은 기존 SQL 그대로 조회하고 holdId를 모아 labelsByHolds()의 바인딩된 IN 조건으로 조회한다. Java Map<Long,List<String>>으로 그룹화하며 반환 예매는 기존 ORDER BY r.id DESC 순서, 각 좌석은 기존 s.id 오름차순을 보존한다. holdId는 응답에서 제거하고 startsAt/status/가격/키 형식은 유지한다. 조회할 ID가 없으면 loop를 실행하지 않아 IN ()나 좌석 SQL이 발생하지 않는다.

IN은 1000개 단위로 분할해 placeholder/packet 크기를 제한한다. 100건은 일괄1회다. 일반식은 history SQL=1+ceil(N/1000), N0일 때1이다. 1000 초과 부하 시험은 미실행이다. 기존 단건 labels()는 호환성과 테스트 전용 기존 방식 비교에 유지했다. 인증·선점·결제·확정·트랜잭션 정책·DB migration·API 계약은 변경하지 않았다.

## SQL 실행 횟수

|건수|기존 서비스|개선 서비스 실측|기존 API|개선 API 실측|
|---:|---:|---:|---:|---:|
|0|미측정|1|미측정|미측정|
|1|2|2|3|3|
|10|11|2|12|3|
|100|101|2|102|3|

0건은 서비스 빈 응답과 SQL1을 별도 검증했다. 나머지는 서비스 각3표본 및 HTTP 각30표본에서 SQL 수가 모두 동일했다. 사용자 재조회1회는 API 전체에 포함된다.

## 비교 환경과 계측

기존 2026-10-31 N+1 보고서·원시CSV·워밍업·반복·제약을 확인했다. 과거 데이터/미커밋 파일은 그대로 보존했다. 과거 평균은 1건7.444/7.622ms, 10건11.136/11.710ms, 100건46.596/51.633ms다.

이번에는 신규 ticketing_v3_history_n1_batch_20261101 DB에 구매자별1/10/100예매(총111), 한 공연/회차, 예매당1석12000원을 구성했다. **동일 DB와 동일 fixture/같은 Spring JVM**에서 테스트 전용 @Primary 서비스가 기존 구현과 실제 개선 구현(super.history)을 전환해 각각 계측했다. 운영 서비스에 전환 플래그를 추가하지 않았다. fixture 생성/인증은 측정에서 제외했다.

기존 측정과 같이 JDK21.0.8+9, Gradle8.14.3, Boot4, MySQL8.4.7, localhost:13306, RANDOM_PORT Tomcat, JDK HTTP/1.1, JDBC execute* 프록시/요청 Filter를 사용했다. 일반 Statement1+PreparedStatement2=3의 calibration도 통과했다. SQL 템플릿만 저장하고 비밀 매개변수/세션은 기록하지 않았다.

방식별 서비스 warmup5+실측3, HTTP warmup5+실측30/크기, seed20261031로 3블록×크기별10요청 순서를 섞었다. HTTP는 System.nanoTime으로 send 직전부터 응답 body 수신/decoding까지이며 JSON assertion 시간은 제외한다. JDBC 계측 overhead는 포함한다. 1개씩 순차 요청했고 캐시를 비우지 않았다. 기존 방식 전체 측정 후 개선 방식을 측정했으므로 개선 쪽이 JIT/DB warm 이점을 얻을 수 있다. AB/BA 교차 실험·유의성 검정·GC 통제는 하지 않았다. 과거 실행과 시간/host scheduling은 같지 않으며 같은 데이터 비교라도 이 순서 편향은 남는다. 운영/대규모 데이터 성능으로 일반화하지 않는다.

## API 시간과 개선율

단위 ms. 조건별30회, p50=중앙값, p95=nearest rank29번째, 제외 표본 없음. 개선율=(기존평균-개선평균)/기존평균×100.

|건수|기존 평균|개선 평균|평균 개선율|기존 p50|개선 p50|기존 p95|개선 p95|기존 최소~최대|개선 최소~최대|
|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
|1|7.873|6.203|21.2%|7.513|4.792|12.072|14.455|4.881~13.508|3.628~19.066|
|10|11.317|6.607|41.6%|11.033|5.583|15.383|9.981|8.114~15.507|4.013~31.070|
|100|47.587|9.609|79.8%|47.528|7.435|61.505|19.928|38.401~62.638|5.213~39.688|

역사적 두 실행 평균과 이번 개선 평균의 비교(조건이 같다고 간주하지 않음):

|건수|과거 Run1/Run2 평균|이번 개선 평균|과거 대비 평균 감소율 Run1/Run2|
|---:|---|---:|---|
|1|7.444/7.622|6.203|16.7%/18.6%|
|10|11.136/11.710|6.607|40.7%/43.6%|
|100|46.596/51.633|9.609|79.4%/81.4%|

100건에서 평균 약79.8% 감소를 관찰했으나 개선율은 이 작은 로컬 시험의 관찰값이다. 1건 p95 악화 및 10건 최대값 증가도 그대로 기록했다. 대용량 응답 직렬화·정렬 비용은 없어지지 않는다.

## EXPLAIN ANALYZE

실제 신규 DB에서 실행했다. 최종 정확성 검사에서 한 예매에 좌석3개를 추가한 **후** 계획을 수집했으므로 labels 테이블114행, 100개 hold 결과103행이다. 시간 측정 당시에는111행/100개 결과100행이었다. 계획 파일은 쿼리·actual time/rows/loops 원문을 보존한다. 단발 실행 계획의 시간을 API 지연 개선율과 혼합하지 않는다.

- 단건 labels: hs PRIMARY(hold_id,seat_id) covering index lookup, seat PRIMARY 단건 lookup, Sort s.id. 최상단 actual0.158ms/1행.
- IN100: MySQL이 hs의 seat_id 보조 인덱스 covering scan114행 후 IN filter103행을 선택했다. **hold_id PRIMARY range lookup을 선택했다고 주장하지 않는다.** seat PRIMARY 단건 lookup loops103, 최종 hold_id/s.id sort. 최상단 actual0.307~0.311ms/103행. 이 작은 데이터에서는 대부분의 행을 선택하므로 전체 covering scan 선택이 가능하다. 다른 크기/분포에서의 계획은 미검증이며 인덱스를 강제하지 않았다.
- history 목록: reservation.user_id 인덱스 lookup100행, h/p PRIMARY lookup, ps1행 scan/hash join 및 r.id DESC 정렬. 최상단 actual0.370~0.374ms/100행. 목록 쿼리 자체는 변경하지 않았다.

## 정확성 및 회귀 결과

- HistoryBatchMeasurementTest 별도 실행1개 PASS, 실패/오류/skipped0. empty SQL1, 1/10/100개 전체 응답 Map을 테스트 전용 기존 구현과 정확히 비교했다. 이는 id/가격/시간/status/좌석 라벨/정렬을 포함한다.
- 다중좌석4개 응답을 검증했다. seat id 순서를 식별하기 위해 라벨 A-111,Z-3,Z-2,Z-1을 사용해 문자열 사전순과 다른 기존 좌석 ID 정렬을 확인했다. 정확한4개 목록과 기존 응답 동등성으로 누락/중복/교차 예매 혼입을 검사했다. 예매 ID 내림차순도 assert했다. 이 추가 라벨 fixture는 성능 측정 후에만 작성했다.
- 별도 신규 ticketing_v3_batch_regression_20261101에서 기존 Backend15개 PASS, 실패/오류0. 실제 인증100명 경쟁1승/99충돌, 선점·결제·부분 롤백·소유권·CSRF·모듈 경계 회귀 포함. opt-in 측정2개는 전체 suite에서는 의도적으로 skipped(그중 이전 미커밋 역사적 테스트1개)였고 신규 계측은 별도 실행에서 통과했다.
- 새 ticketing_v3_batch_e2e_20261101에서 개선 불변 JAR로 실제 Chromium→Next→Spring→MySQL E2E PASS: 판매자 생성/회차2개/판매→관리자 승인→구매자 가입/로그인/선점/결제 성공·실패/내역/복원/해제/다른 회차 독립성/390px. **90개 API 응답 OpenAPI 계약 일치**. 최종 DB6종 이상0건, 예매1건.
- 이번 E2E는 V3_QA_WAIT_EXPIRY 미설정으로 300초 실제 만료 대기를 재실행하지 않았다. 만료 백엔드 회귀와 과거 실시간 만료 증거를 이번 실시간 검증으로 대체해 주장하지 않는다.
- BUILD SUCCESSFUL test/bootJar. 컴파일 unchecked cast 경고(테스트 Map 변환) 및 JVM class sharing 경고가 있었고 테스트 실패는 없었다. 프런트엔드 코드 변경이 없어 기존 production build를 사용했으며 새 frontend build/unit suite는 재실행하지 않았다.

## 한계와 후속 개선

ID1000 초과는 SQL이 chunk 수만큼 늘고 Java가 전체 내역/라벨을 메모리에 보관한다. 무제한 history 응답·페이지네이션·대량 sort/packet 비용은 남는다. 읽기 트랜잭션 격리 및 동시 변경에 대한 정책은 이번에 바꾸지 않았다. 미래에는 실사용 규모/분포의 EXPLAIN, AB/BA 반복·더 큰 표본·원격 DB·실제 동시성 조건에서 재측정하고 pagination 요구사항을 별도 검토할 수 있다. 이번에는 추가 인덱스/캐시/권한 정책/결제 정책을 도입하지 않았다.

## 근거와 재현

[원시 SQL/시간 CSV](2026-11-01-history-batch/history-n1-raw.csv), [요약 JSON](2026-11-01-history-batch/summary.json), [SQL 템플릿](2026-11-01-history-batch/history-n1-sql.txt), [계측 JUnit](2026-11-01-history-batch/measurement-test.json), [전체 Backend 결과](2026-11-01-history-batch/backend-tests.json), [E2E DB 정합성](2026-11-01-history-batch/e2e-consistency.tsv).

실행 계획: [단건](2026-11-01-history-batch/explain-labels-single.txt), [IN100](2026-11-01-history-batch/explain-labels-batch100.txt), [history](2026-11-01-history-batch/explain-history.txt).

재현: 새 이름의 ticketing_v3_history_n1_* DB를 생성하고 JAVA_HOME=work/tools/jdk-21.0.8+9, GRADLE_USER_HOME=work/gradle-home, V3_HISTORY_BATCH=true, V3_HISTORY_SCHEMA=<새 스키마>, V3_HISTORY_OUTPUT=<새 출력 디렉터리>, V3_DB_URL=<그 새 스키마 JDBC UTC URL>, V3_DB_USER/PASSWORD를 안전하게 주입한다. `work/tools/gradle-8.14.3/bin/gradle -p backend test --tests '*HistoryBatchMeasurementTest' --rerun-tasks --no-daemon --max-workers=2` 실행. 네트워크 의존성 다운로드 시 backend README의 기존 proxy/CA 옵션을 사용한다. 계측은 기존 reservation이 있으면 쓰기 전에 거부하며 데이터 삭제/정리를 수행하지 않는다. 전체 회귀는 V3_MYSQL_TEST=true와 또 다른 새 DB로 실행한다.

기존 파일·측정 결과·DB를 삭제하거나 초기화하지 않았다. 이전 미커밋 복구/측정 파일은 작업본에 보존하고 이번 변경만 커밋 대상으로 선택한다. 최신 dev에서 독립 브랜치로 작업했으며 검증 결과를 dev에 fast-forward 통합·정상 Push한다. main/V1/V2는 변경하지 않는다. 실제 Git 커밋과 Push 확인 결과는 완료 응답에 제공한다.
