-- D1 Free tier 성능 최적화: 풀 테이블 스캔 방지 및 인덱스 추가

-- 1. 파이프라인 단계별 상태 확인(new, scored, selected) 및 공개 API 날짜 그룹핑용 커버링 인덱스
CREATE INDEX IF NOT EXISTS items_status_day ON items (status, day);

-- 2. Reddit 댓글 요약 재시도 큐 조회 최적화
CREATE INDEX IF NOT EXISTS items_source_status_collected ON items (source, status, collected_at);

-- 3. 만료 데이터 및 탈락(skipped) 글 정리 최적화
CREATE INDEX IF NOT EXISTS items_collected_status ON items (collected_at, status);

-- 4. 유튜브 채널별 완료 영상 개수 서브쿼리 최적화
CREATE INDEX IF NOT EXISTS videos_channel_status ON videos (channel_id, status);
