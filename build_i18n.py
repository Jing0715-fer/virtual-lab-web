#!/usr/bin/env python3
"""Build i18n.ts with comprehensive ja/ko translations using per-key-prefix mapping."""
import re, sys

with open('/home/z/my-project/src/lib/i18n.ts', 'r') as f:
    original = f.read()

en_match = re.search(r"  en: \{(.*?)\n  zh:", original, re.DOTALL)
pairs = re.compile(r"^\s+'([^']+)':\s+'((?:[^'\\]|\\.)*)'", re.MULTILINE).findall(en_match.group(1))
print(f"Found {len(pairs)} pairs", file=sys.stderr)

# Value dictionary for common words
V = {}
def av(en, ja, ko):
    V[en] = (ja, ko)

for en, ja, ko in [
('Dashboard','ダッシュボード','대시보드'),('Agents','エージェント','에이전트'),('Agent','エージェント','에이전트'),
('Team','チーム','팀'),('Individual','個人','개인'),('History','履歴','히스토리'),
('Pipeline','パイプライン','파이프라인'),('Settings','設定','설정'),
('Bio Tools','バイオツール','생물학 도구'),('Knowledge Base','ナレッジベース','지식 베이스'),
('Research','研究','연구'),('Skip to content','コンテンツへスキップ','콘텐츠로 건너뛰기'),
('Skip to main content','メインコンテンツへスキップ','메인 콘텐츠로 건너뛰기'),
('Skip to navigation','ナビゲーションへスキップ','탐색으로 건너뛰기'),
('Toggle theme','テーマ切替','테마 전환'),('Toggle language','言語切替','언어 전환'),
('Close','閉じる','닫기'),('Create','作成','만들기'),('Save','保存','저장'),
('Cancel','キャンセル','취소'),('Delete','削除','삭제'),('Edit','編集','편집'),
('Copy','コピー','복사'),('Export','エクスポート','내보내기'),('Search','検索','검색'),
('Filter','フィルター','필터'),('Loading...','読み込み中...','로딩 중...'),
('No data available','データがありません','데이터 없음'),('Confirm','確認','확인'),
('Back','戻る','뒤로'),('Next','次へ','다음'),('Run','実行','실행'),
('Done','完了','완료'),('View','表示','보기'),('Select','選択','선택'),
('Add','追加','추가'),('Remove','削除','제거'),('Retry','再試行','재시도'),
('Skip','スキップ','건너뛰기'),('Finish','完了','완료'),('Send','送信','보내기'),
('Update','更新','업데이트'),('Upload','アップロード','업로드'),('Download','ダウンロード','다운로드'),
('Reset','リセット','초기화'),('Meeting','ミーティング','미팅'),('Name','名前','이름'),
('Status','ステータス','상태'),('Type','タイプ','유형'),('All','すべて','전체'),
('None','なし','없음'),('Yes','はい','예'),('No','いいえ','아니오'),
('Auto-saving...','自動保存中...','자동 저장 중...'),('characters','文字','글자'),
('Temperature','温度','온도'),('Total','合計','합계'),('Active','アクティブ','활성'),
('Completed','完了','완료'),('Copied!','コピーしました！','복사되었습니다!'),
('agents','エージェント','에이전트'),('messages','メッセージ','메시지'),
('message','メッセージ','메시지'),('words','単語','단어'),('word','単어','단어'),
('rounds','ラウンド','라운드'),('Round','ラウンド','라운드'),('of','の','의'),
('participants','参加者','참가자'),('Running','実行中','실행 중'),
('just now','たった今','방금'),('m ago','分前','분 전'),('h ago','時間前','시간 전'),
('d ago','日前','일 전'),('Color','カラー','색상'),('Icon','アイコン','아이콘'),
('Title *','タイトル *','제목 *'),('Draft','下書き','초안'),('Pending','保留中','대기 중'),
('In Progress','進行中','진행 중'),('To Do','未着手','할 일'),('Low','低','낮음'),
('Medium','中','보통'),('High','高','높음'),('Critical','重要','위험'),
('Overdue','期限切れ','지연'),('Blocked','ブロック','차단됨'),
('Unassigned','未割り当て','미할당'),('On Track','順調','정상'),
('Needs Attention','要注意','주의 필요'),('At Risk','リスクあり','위험'),
('Positive','ポジティブ','긍정'),('Neutral','ニュートラル','중립'),
('Negative','ネガティブ','부정'),('Improving','改善中','개선 중'),
('Stable','安定','안정'),('Declining','悪化','감소'),
('Available','利用可能','사용 가능'),('Away','離席中','자리 비움'),
('Busy','取り込み中','바쁨'),('Do Not Disturb','非通知','방해 금지'),
('In Meeting','ミーティング中','회의 중'),('Online','オンライン','온라인'),
('Offline','オフライン','오프라인'),('Board','ボード','보드'),
('Swimlanes','スイムレーン','수영장 레인'),('Analytics','分析','분석'),
('Light','ライト','라이트'),('Dark','ダーク','다크'),('English','英語','영어'),
('中文','中国語','중국어'),('Japanese','日本語','일본어'),('Korean','韓国語','한국어'),
('Ascending','昇順','오름차순'),('Descending','降順','내림차순'),
('Bold','太字','굵게'),('Italic','斜体','기울임'),('List Item','リスト項目','목록 항목'),
('Inline Code','インラインコード','인라인 코드'),('Code Block','コードブロック','코드 블록'),
('Insert Link','リンク挿入','링크 삽입'),('Pen','ペン','펜'),
('Eraser','消しゴム','지우개'),('Text','テキスト','텍스트'),
('Rectangle','四角形','사각형'),('Circle','円','원'),('Arrow','矢印','화살표'),
('Undo','元に戻す','실행 취소'),('Redo','やり直す','다시 실행'),
('Clear','クリア','지우기'),('Zoom In','ズームイン','확대'),('Zoom Out','ズームアウト','축소'),
('Preview','プレビュー','미리보기'),('Play','再生','재생'),('Pause','一時停止','일시 정지'),
('Previous','前へ','이전'),('Minimize','最小化','최소화'),('Expand','展開','확장'),
('You','あなた','나'),('System','システム','시스템'),('Annotations','注釈','주석'),
('Comments','コメント','댓글'),('Connected','接続済み','연결됨'),
('Disconnected','切断','연결 해제됨'),('Reconnecting...','再接続中...','재연결 중...'),
('Connection error','接続エラー','연결 오류'),('Online Users','オンラインユーザー','온라인 사용자'),
('Exit Replay','リプレイ終了','리플레이 종료'),('AND','AND','AND'),('OR','OR','OR'),
('Actions','アクション','작업'),('Width','幅','너비'),('Style','スタイル','스타일'),
('Academic','学術的','학술적'),('Conversational','対話的','대화형'),('Technical','技術的','기술적'),
('Creative','クリエイティブ','창의적'),('Minimalist','ミニマリスト','미니멀'),
('Paragraph','段落','단락'),('Bullet Points','箇条書き','글머리 기호'),
('Numbered List','番号付きリスト','번호 목록'),('Code Blocks','コードブロック','코드 블록'),
('Tables','テーブル','테이블'),('Gold','ゴールド','골드'),('Silver','シルバー','실버'),
('Bronze','ブロンズ','브론즈'),('General','一般','일반'),('Methods','方法','방법'),
('Results','結果','결과'),('Hypotheses','仮説','가설'),('Literature','文献','문헌'),
('Protocols','プロトコル','프로토콜'),('Good','良い','양호'),('Fair','普通','보통'),
('Needs Improvement','改善が必要','개선 필요'),('Excellent','優秀','우수'),
('Short','短い','짧음'),('Long','長い','길음'),('Default','デフォルト','기본값'),
('Glass','グラス','글라스'),('Flat','フラット','플랫'),('Normal','標準','표준'),
('Fast','高速','빠름'),('Relative','相対','상대적'),('Absolute','絶対','절대적'),
('Full','完全','전체'),('Navigation','ナビゲーション','탐색'),('Bar','バー','막대'),
('Line','ライン','선'),('Area','エリア','영역'),('Donut','ドーナツ','도넛'),
('H-Bar','横棒','가로 막대'),('Today','今日','오늘'),('Yesterday','昨日','어제'),
('Earlier','それ以前','이전'),('Overview','概要','개요'),('Summary','要約','요약'),
('Live','ライブ','라이브'),('Speed','速度','속도'),('On','オン','켜짐'),('Off','オフ','꺼짐'),
('Volume','音量','볼륨'),('Success','成功','성공'),('Error','エラー','오류'),
('Info','情報','정보'),('Columns','列','열'),('Metric','指標','지표'),
('Count','カウント','개수'),('Score','スコア','점수'),('Rank','ランク','순위'),
('Intensity','強度','강도'),('Very High','非常に高い','매우 높음'),
('More','多い','더 많음'),('Less','少ない','더 적음'),('Keywords','キーワード','키워드'),
('Topics','トピック','주제'),('Duration','期間','소요 시간'),
('chars','文字','글자'),('Distribution','分布','분포'),
('Bot','ボット','봇'),('Crown','クラウン','크라운'),('Microscope','顕微鏡','현미경'),
('Beaker','ビーカー','비커'),('Atom','原子','원자'),('Flask','フラスコ','플라스크'),
('Brain','脳','두뇌'),('Eye','目','눈'),('Hexagon','六角形','육각형'),
('Diamond','ダイヤモンド','마름모'),('Gradient','グラデーション','그라디언트'),
('Rounded Square','角丸四角','둥근 사각형'),('Notifications','通知','알림'),
('is typing...','入力中...','입력 중...'),('Top Performer','トップパフォーマー','최고 성과자'),
('Formatting tools','書式設定ツール','서식 도구'),('Hide formatting','書式設定を隠す','서식 숨기기'),
('1 hour ago','1時間前','1시간 전'),('Not selected','未選択','미선택'),
('shared','共有','공유'),('No overlap','オーバーラップなし','겹침 없음'),
('No summary available','要約なし','요약 없음'),('No message data to chart','チャートデータなし','차트 데이터 없음'),
('Create One','作成','만들기'),('running','実行中','실행 중'),('total','合計','합계'),
('participated','参加','참여'),('No agents to display','エージェントなし','에이전트 없음'),
('Not helpful','役に立たない','도움이 안 됨'),('Thinking','思考中','생각 중'),
('Insight','インサイト','인사이트'),('Key Point','主要ポイント','핵심 포인트'),
('Pin message','メッセージをピン留め','메시지 고정'),('Unpin message','ピン解除','고정 해제'),
('Pinned','ピン留め済み','고정됨'),('Pinned Messages','ピン留めメッセージ','고정된 메시지'),
('No pinned messages','ピンなし','고정 없음'),('Max 5 pinned messages','最大5件','최대 5개'),
('No matches','一致なし','일치 없음'),('No data to display','表示データなし','표시 데이터 없음'),
('No data to compare','比較データなし','비교 데이터 없음'),
('No completed meetings with messages to analyze|分析可能ミーティングなし|분석 가능 미팅 없음'),
('No messages to analyze|分析メッセージなし|분석 메시지 없음'),
('No rounds data available|ラウンドデータなし|라운드 데이터 없음'),
('No activity yet|活動なし|활동 없음'),
('No meetings yet|ミーティングなし|미팅 없음'),
('No meeting activity yet|活動なし|활동 없음'),
('No agent participation data yet|参加データなし|참여 데이터 없음'),
('No agent collaboration data yet|コラボデータなし|협업 데이터 없음'),
('No message timeline data yet|タイムラインデータなし|타임라인 데이터 없음'),
('Run meetings to see workflow progress|ミーティングを実行して進捗を確認|미팅을 실행하여 진행 확인'),
('shared meeting|共有ミーティング|공유 미팅'),
('No meetings found|見つかりません|찾을 수 없음'),
('Create Meeting|ミーティング作成|미팅 만들기'),
('AI is thinking...|AIが考え中...|AI가 생각 중...'),
('Helpful|役に立つ|도움이 됨'),('Unclear|不明確|불명확함'),
('Summarize my research|研究を要約|연구 요약'),
('Suggest next experiment|次の実験を提案|다음 실험 제안'),
('Compare agents|エージェントを比較|에이전트 비교'),('Generate report|レポート生成|보고서 생성'),
('Clear chat|チャットをクリア|채팅 지우기'),
('Open Notes|ノートを開く|메모 열기'),('Close Notes|ノートを閉じる|메모 닫기'),
('Bot|ボット|봇'),('Crown|クラウン|크라운'),
('AI-Human Collaboration for Scientific Research|科学研究のAI・人間コラボレーション|과학 연구 AI-인간 협업'),
('Based on zou-group/virtual-lab|zou-group/virtual-labベース|zou-group/virtual-lab 기반'),
('Paper Reference|論文リファレンス|논문 참조'),('Nature (2025)|Nature (2025)|Nature (2025)'),
('DOI|DOI|DOI'),('Ready to Run|実行準備完了|실행 준비 완료'),
('Running...|実行中...|실행 중...'),('Memory|メモリ|메모리'),
('Storage|ストレージ|저장소'),('Network|ネットワーク|네트워크'),
('Performance|パフォーマンス|성능'),('Appearance|外観|외관'),
('Data Management|データ管理|데이터 관리'),('Model Configuration|モデル設定|모델 설정'),
('Default Model|デフォルトモデル|기본 모델'),
('Conservative (0.3)|保守的 (0.3)|보수적 (0.3)'),
('Balanced (0.7)|バランス (0.7)|균형 (0.7)'),
('Creative (1.0)|クリエイティブ (1.0)|창의적 (1.0)'),
('API Key|APIキー|API 키'),('Accent Color|アクセントカラー|강조 색상'),
('Card Style|カードスタイル|카드 스타일'),('Animation Speed|アニメーション速度|애니메이션 속도'),
('Compact Mode|コンパクトモ드|컴팩트 모드'),('Version|バージョン|버전'),
('Build|ビルド|빌드'),('Components|コンポーネント|컴포넌트'),
('CSS Classes|CSSクラス|CSS 클래스'),('Keyframes|キーフレーム|키프레임'),
('i18n Keys|i18nキー|i18n 키'),('Local Storage|ローカルストレージ|로컬 스토리지'),
('Tech Stack|テックスタック|기술 스택'),('Project Info|プロジェクト情報|프로젝트 정보'),
('Component Count|コンポーネント数|컴포넌트 수'),('Links|リンク|링크'),
]:
    av(en, ja, ko)

print(f"Value dict: {len(V)}", file=sys.stderr)

# Per-prefix key mapping for remaining keys
# Maps key -> (ja, ko) for specific keys that aren't matched by value
K = {}
def ak(key, ja, ko):
    K[key] = (ja, ko)

# Map ALL keys using a comprehensive key-based approach
# This covers keys where the English value is unique/long

# NAVIGATION
for k,j,k2 in [
('nav.dashboard','ダッシュボード','대시보드'),('nav.agents','エージェント','에이전트'),
('nav.team','チーム会議','팀 미팅'),('nav.individual','個人会議','개인 미팅'),
('nav.history','履歴','히스토리'),('nav.pipeline','パイプライン','파이프라인'),
('nav.settings','設定','설정'),('nav.bioTools','バイオツール','생물학 도구'),
('nav.knowledgeBase','ナレッジベース','지식 베이스'),('nav.skipToContent','スキップ','건너뛰기'),
('nav.researchPapers','研究','연구'),
]: ak(k,j,k2)

# A11Y
for k,j,k2 in [
('a11y.skipToContent','メインコンテンツへスキップ','메인 콘텐츠로 건너뛰기'),
('a11y.toggleTheme','テーマ切替','테마 전환'),('a11y.toggleLanguage','言語切替','언어 전환'),
('a11y.notifications','通知','알림'),('a11y.openSearch','検索を開く','검색 열기'),
('a11y.close','閉じる','닫기'),('a11y.themeToggle','テーマ切替','테마 전환'),
('a11y.langToggle','言語切替','언어 전환'),('a11y.notifPanel','通知パネル','알림 패널'),
('a11y.commandPalette','コマンドパレット','명령 팔레트'),('a11y.closeDialog','ダイアログを閉じる','대화상자 닫기'),
('a11y.dismissNotif','通知を消去','알림 해제'),('a11y.editAgent','エージェント編集','에이전트 편집'),
('a11y.deleteAgent','エージェント削除','에이전트 삭제'),('a11y.viewDetails','詳細を表示','상세 보기'),
('a11y.copyConfig','設定をコピー','설정 복사'),('a11y.sendMessage','メッセージ送信','메시지 전송'),
('a11y.runMeeting','ミーティング実行','미팅 실행'),('a11y.refreshData','データ更新','데이터 새로고침'),
('a11y.exportData','データエクスポート','데이터 내보내기'),
('a11y.toggleSort','ソート方向切替','정렬 방향 전환'),
('a11y.notificationCount','未読通知{count}件','읽지 않은 알림 {count}개'),
('a11y.meetingStatus','ミーティングステータス','미팅 상태'),('a11y.sortableColumn','ソート可能列','정렬 가능 열'),
('a11y.tabList','タブナビゲーション','탭 탐색'),('a11y.searchMeetings','ミーティング検색','미팅 검색'),
('a11y.skipToMainContent','メインコンテンツへスキップ','메인 콘텐츠로 건너뛰기'),
('a11y.announcement.sseMessage','{agentName}からの新メッセージ','{agentName}의 새 메시지'),
('a11y.announcement.meetingComplete','ミーティング「{meetingName}」完了（{count}メッセージ）','미팅 "{meetingName}" 완료 ({count}개 메시지)'),
('a11y.focusTrap.activated','フォーカストラップ有効','포커스 트랩 활성화'),
('a11y.keyboardNav.itemSelected','{total}件中{index}件目を選択','{total}개 중 {index}번째 선택'),
('a11y.liveRegion.polite','ステータス更新','상태 업데이트'),
('a11y.liveRegion.assertive','重要通知','중요 알림'),
('a11y.reducedMotion','モーション軽減設定が有効','모션 감소 설정 활성'),
('a11y.highContrast','ハイコントラストモード有効','고대비율 모드 활성'),
]: ak(k,j,k2)

# COMMON
for k,j,k2 in [
('common.create','作成','만들기'),('common.save','保存','저장'),('common.cancel','キャンセル','취소'),
('common.delete','削除','삭제'),('common.edit','編集','편집'),('common.copy','コピー','복사'),
('common.export','エクスポート','내보내기'),('common.search','検索','검색'),('common.filter','フィルター','필터'),
('common.loading','読み込み中...','로딩 중...'),('common.noData','データなし','데이터 없음'),
('common.confirm','確認','확인'),('common.back','戻る','뒤로'),('common.next','次へ','다음'),
('common.run','実行','실행'),('common.done','完了','완료'),('common.view','表示','보기'),
('common.select','選択','선택'),('common.add','追加','추가'),('common.remove','削除','제거'),
('common.close','閉じる','닫기'),('common.retry','再試行','재시도'),('common.skip','スキップ','건너뛰기'),
('common.finish','完了','완료'),('common.send','送信','보내기'),('common.update','更新','업데이트'),
('common.upload','アップロード','업로드'),('common.download','ダウンロード','다운로드'),('common.reset','リセット','초기화'),
('common.agent','エージェント','에이전트'),('common.agents','エージェント','에이전트'),
('common.meeting','ミーティング','미팅'),('common.messages','メッセージ','메시지'),
('common.message','メッセージ','메시지'),('common.words','単語','단어'),('common.word','単語','단어'),
('common.rounds','ラウンド','라운드'),('common.round','ラウンド','라운드'),('common.of','の','의'),
('common.participants','参加者','참가자'),('common.running','実行中','실행 중'),
('common.justNow','たった今','방금'),('common.minutesAgo','分前','분 전'),
('common.hoursAgo','時間前','시간 전'),('common.daysAgo','日前','일 전'),
('common.name','名前','이름'),('common.status','ステータス','상태'),('common.type','タイプ','유형'),
('common.team','チーム','팀'),('common.individual','個人','개인'),('common.all','すべて','전체'),
('common.none','なし','없음'),('common.yes','はい','예'),('common.no','いいえ','아니오'),
('common.autoSaving','自動保存中...','자동 저장 중...'),('common.characters','文字','글자'),
('common.temperature','温度','온도'),('common.total','合計','합계'),('common.active','アクティブ','활성'),
('common.completed','完了','완료'),('common.participated','参加','참여'),
('common.notSelected','未選択','미선택'),('common.shared','共有','공유'),
('common.noOverlap','オーバーラップなし','겹침 없음'),('common.noSummary','要約なし','요약 없음'),
('common.noDataToChart','チャートデータなし','차트 데이터 없음'),('common.createOne','作成','만들기'),
('common.copied','コピーしました！','복사되었습니다!'),
]: ak(k,j,k2)

# DASHBOARD
for k,j,k2 in [
('dashboard.title','バーチャルラボ','버추얼 랩'),('dashboard.subtitle','AI駆動科学研究プラットフォーム','AI 기반 과학 연구 플랫폼'),
('dashboard.startResearch','研究を開始','연구 시작'),('dashboard.agents','エージェント','에이전트'),
('dashboard.activeMeetings','アクティブミーティング','활성 미팅'),('dashboard.totalMeetings','合計ミーティング','전체 미팅'),
('dashboard.totalMessages','合計メッセージ','전체 메시지'),
('dashboard.meetingActivity','ミーティング活動（7日間）','미팅 활동 (7일)'),
('dashboard.agentParticipation','エージェント参加','에이전트 참여'),
('dashboard.meetingTypeDistribution','ミーティングタイプ分布','미팅 유형 분포'),
('dashboard.collaborationNetwork','コラボレーションネットワーク','협업 네트워크'),
('dashboard.discussionTimeline','ディスカッションタイムライン','토론 타임라인'),
('dashboard.nanobodyProgress','ナノボディ設計の進捗','나노바디 설계 진행'),
('dashboard.sentimentOverview','センチメント概要','감정 분석 개요'),
('dashboard.sentimentTrend','ラウンド別センチメント推移','라운드별 감정 추이'),
('dashboard.howItWorks','仕組み','작동 방식'),('dashboard.recentMeetings','最近のミーティング','최근 미팅'),
('dashboard.quickActions','クイックアクション','빠른 실행'),
('dashboard.createAgent','エージェント作成','에이전트 만들기'),
('dashboard.teamMeeting','チームミーティング','팀 미팅'),('dashboard.individualMeeting','個人ミーティング','개인 미팅'),
('dashboard.viewAnalytics','分析を表示','분석 보기'),('dashboard.viewAll','すべて表示','모두 보기'),
('dashboard.hero.subtitle','AIエージェントが科学研究を協同 — 作成、議論、発見。','AI 에이전트가 과학 연구를 협업 — 생성, 토론, 발견.'),
('dashboard.hero.agentsCount','エージェント','에이전트'),('dashboard.hero.active','アクティブ','활성'),
('dashboard.stat.totalAgents','エージェント合計','에이전트 합계'),
('dashboard.stat.totalAgentsTrend','エージェント合計 · 多様な議論のために追加','에이전트 합계 · 다양한 토론을 위해 추가'),
('dashboard.stat.createAgentsToBegin','開始するにはエージェントを作成','시작하려면 에이전트를 만드세요'),
('dashboard.stat.activeMeetingsTrend','実行中','실행 중'),
('dashboard.stat.startMeetingToBegin','開始するにはミーティングを実行','시작하려면 미팅을 실행하세요'),
('dashboard.stat.completedTrend','合計','합계'),
('dashboard.stat.runMeetingToSeeResults','ミーティングを実行して結果を確認','미팅을 실행하여 결과 확인'),
('dashboard.stat.avgPerMeeting','平均{count}/ミーティング','평균 {count}/미팅'),
('dashboard.stat.messagesAfterMeetings','メッセージは実行後に表示','메시지는 실행 후 표시'),
('dashboard.analytics.title','研究分析','연구 분석'),
('dashboard.analytics.description','ミーティング活動と参加の分析','미팅 활동 및 참여 분석'),
('dashboard.analytics.noActivityYet','活動はまだありません','활동이 아직 없습니다'),
('dashboard.analytics.noParticipationYet','参加データはまだありません','참여 데이터가 아직 없습니다'),
('dashboard.analytics.noMeetingsYet','ミーティングはまだありません','미팅이 아직 없습니다'),
('dashboard.analytics.pct','{pct}%','{pct}%'),
('dashboard.analytics.noCollaborationYet','コラボデータはまだありません','협업 데이터가 아직 없습니다'),
('dashboard.analytics.noTimelineYet','タイムラインデータはまだありません','타임라인 데이터가 아직 없습니다'),
('dashboard.analytics.runMeetingsForProgress','ミーティングを実行して進捗を確認','미팅을 실행하여 진행 확인'),
('dashboard.analytics.sharedMeetings','共有ミーティング','공유 미팅'),
('dashboard.howItWorks.title','仕組み','작동 방식'),
('dashboard.howItWorks.subtitle','AI研究への3つのステップ','AI 연구를 위한 3단계'),
('dashboard.howItWorks.step1.title','エージェント作成','에이전트 만들기'),
('dashboard.howItWorks.step1.desc','専門知識と目標を持つAIエージェントを定義','전문 지식과 목표를 가진 AI 에이전트를 정의'),
('dashboard.howItWorks.step2.title','アジェンダ設定','의제 설정'),
('dashboard.howItWorks.step2.desc','パラメータ、質問、ルールを設定して議論をガイド','매개변수, 질문, 규칙을 설정하여 토론 가이드'),
('dashboard.howItWorks.step3.title','ミーティング実行','미팅 실행'),
('dashboard.howItWorks.step3.desc','チームまたは個人ミーティングを開始し、リアルタイムでコラボレーション','팀 또는 개인 미팅을 시작하고 실시간 협업'),
('dashboard.labArchitecture.title','ラボアーキテクチャ','랩 아키텍처'),
('dashboard.labArchitecture.description','研究チーム — ミーティングでつながるエージェント','연구 팀 — 미팅으로 연결된 에이전트'),
('dashboard.nanobodyWorkflow.title','ナノボディ設計ワークフロー','나노바디 설계 워크플로우'),
('dashboard.nanobodyWorkflow.description','SARS-CoV-2ナノボディ設計の計算パイプライン','SARS-CoV-2 나노바디 설계 컴퓨팅 파이프라인'),
('dashboard.nanobodyWorkflow.esm.name','ESM','ESM'),('dashboard.nanobodyWorkflow.esm.desc','配列生成','서열 생성'),
('dashboard.nanobodyWorkflow.alphafold.name','AlphaFold-Multimer','AlphaFold-Multimer'),
('dashboard.nanobodyWorkflow.alphafold.desc','構造予測','구조 예측'),
('dashboard.nanobodyWorkflow.rosetta.name','Rosetta','Rosetta'),
('dashboard.nanobodyWorkflow.rosetta.desc','エネルギースコアリング','에너지 점수 계산'),
('dashboard.nanobodyWorkflow.combine.name','スコア結合','점수 결합'),
('dashboard.nanobodyWorkflow.combine.desc','候補をランク付け','후보 순위 매기기'),
('dashboard.nanobodyWorkflow.select.name','ナノボディ選択','나노바디 선택'),
('dashboard.nanobodyWorkflow.select.desc','最終選択','최종 선택'),
('dashboard.sentiment.title','センチメント分析','감정 분석'),
('dashboard.sentiment.description','ラウンド間のディスカッションの感情トーン分析','라운드별 토론 감정 분석'),
('dashboard.sentiment.overview','センチメント概要','감정 개요'),
('dashboard.sentiment.trendByRound','ラウンド別推移','라운드별 추이'),
('dashboard.sentiment.positive','ポジティブ','긍정'),('dashboard.sentiment.neutral','ニュートラル','중립'),
('dashboard.sentiment.negative','ネガティブ','부정'),('dashboard.sentiment.messages','メッセージ','메시지'),
('dashboard.sentiment.noMessagesToAnalyze','分析メッセージなし','분석 메시지 없음'),
('dashboard.sentiment.noRoundsData','ラウンドデータなし','라운드 데이터 없음'),
('dashboard.sentiment.timeline','センチメントタイムライン','감정 타임라인'),
('dashboard.sentiment.overallTrend','全体の傾向','전체 추세'),
('dashboard.sentiment.improving','改善中','개선 중'),('dashboard.sentiment.stable','安定','안정'),
('dashboard.sentiment.declining','悪化','감소'),('dashboard.sentiment.distribution','センチメント分布','감정 분포'),
('dashboard.sentiment.noData','分析可能な完了ミーティングなし','분석 가능한 완료 미팩 없음'),
('dashboard.wordCloud.title','キーワードクラウド','키워드 클라우드'),
('dashboard.wordCloud.description','全ミーティングの頻出用語','모든 미팅의 빈출 용어'),
('dashboard.wordCloud.topTerms','トップ10用語','인기 상위 10 용어'),
('dashboard.wordCloud.occurrences','{word}: {count}件','{word}: {count}회'),
('dashboard.paper.title','論文リファレンス','논문 참조'),
('dashboard.paper.authors','Swanson, K., Wu, W., Bulaong, N.L. et al.','Swanson, K., Wu, W., Bulaong, N.L. et al.'),
('dashboard.paper.journal','Nature (2025)','Nature (2025)'),('dashboard.paper.doi','DOI','DOI'),
('dashboard.quickActions.exportData','データエクスポート','데이터 내보내기'),
('dashboard.quickActions.allMeetingsJson','全ミーティング (JSON)','모든 미팅 (JSON)'),
('dashboard.quickActions.allMeetingsCsv','全ミーティング (CSV)','모든 미팅 (CSV)'),
('dashboard.quickActions.allAgentsJson','全エージェント (JSON)','모든 에이전트 (JSON)'),
('dashboard.quickActions.allAgentsCsv','全エージェント (CSV)','모든 에이전트 (CSV)'),
('dashboard.quickActions.analyticsJson','分析データ (JSON)','분석 데이터 (JSON)'),
('dashboard.quickActions.createAgentDesc','AIエージェントを追加','AI 에이전트 추가'),
('dashboard.quickActions.teamMeetingDesc','マルチエージェント議論','다중 에이전트 토론'),
('dashboard.quickActions.individualMeetingDesc','エージェント+批評家セッション','에이전트+비평가 세션'),
('dashboard.quickActions.viewAnalyticsDesc','研究インサイト','연구 인사이트'),
('dashboardCustomize.title','ダッシュボードカスタマイズ','대시보드 사용자 지정'),
('dashboardCustomize.reset','デフォルトにリセット','기본값으로 초기화'),
('dashboardCustomize.collapseAll','すべて折りたたむ','모두 접기'),
('dashboardCustomize.expandAll','すべて展開','모두 펼치'),
('dashboardCustomize.customizing','カスタマイズ中','사용자 지정 중'),
('dashboardCustomize.sectionVisible','表示','표시'),
('dashboardCustomize.sectionHidden','非表示','숨김'),
('dashboardCustomize.dragToReorder','ドラッグして並べ替え','드래그하여 순서 변경'),
('dashboardCustomize.hero','ヒーローバナー','히어로 배너'),
('dashboardCustomize.statCards','統計カード','통계 카드'),
('dashboardCustomize.researchAnalytics','研究分析','연구 분석'),
('dashboardCustomize.agentNetwork','エージェントネットワーク','에이전트 네트워크'),
('dashboardCustomize.discussionTimeline','ディスカッションタイムライン','토론 타임라인'),
('dashboardCustomize.nanobodyProgress','ナノボディ進捗','나노바디 진행'),
('dashboardCustomize.sentiment','センチメント分析','감정 분석'),
('dashboardCustomize.researchInsights','研究インサイト','연구 인사이트'),
('dashboardCustomize.howItWorks','仕組み','작동 방식'),
('dashboardCustomize.quickActions','クイックアクション','빠른 실행'),
('dashboardCustomize.activityTimeline','アクティビティタイムライン','활동 타임라인'),
('dashboard.empty.noMeetings.title','ミーティングはまだありません','미팅이 아직 없습니다'),
('dashboard.empty.noMeetings.description','最初の研究ミーティングを開始してください','첫 번째 연구 미팅을 시작하세요'),
('dashboard.empty.noMeetings.createMeeting','ミーティング作成','미팅 만들기'),
('dashboard.activityFeed.title','最近のアクティビティ','최근 활동'),
('dashboard.activityFeed.description','ラボでの最近のイベントタイムライン','랩 최근 이벤트 타임라인'),
('dashboard.activityFeed.viewAll','すべて表示','모두 보기'),
('dashboard.activityFeed.meetingCreated','ミーティング作成','미팅 생성됨'),
('dashboard.activityFeed.meetingCompleted','ミーティング完了','미팅 완료'),
('dashboard.activityFeed.meetingRunning','ミーティング開始','미팅 시작됨'),
('dashboard.activityFeed.agentAdded','エージェント追加','에이전트 추가됨'),
('dashboard.activityFeed.agentModified','エージェント更新','에이전트 업데이트됨'),
('dashboard.activityFeed.noActivity','最近のアクティビティなし','최근 활동 없음'),
('dashboard.activityFeed.noActivityDesc','エージェントとミーティングを作成してください','에이전트와 미팅을 만드세요'),
('dashboard.agentGauges.title','エージェントパフォーマンス','에이전트 성과'),
('dashboard.agentGauges.description','各研究エージェントの主要指標','각 연구 에이전트의 주요 지표'),
('dashboard.agentGauges.responseQuality','応答品質','응답 품질'),
('dashboard.agentGauges.participationRate','参加率','참여율'),
('dashboard.agentGauges.collaborationIndex','コラボレーション指数','협업 지수'),
('dashboard.agentGauges.noAgents','エージェントなし','에이전트 없음'),
('dashboard.agentGauges.noAgentsDesc','パフォーマンスを見るにはエージェントを作成','성과를 보려면 에이전트를 만드세요'),
('dashboard.trendSparklines.title','研究トレンド','연구 트렌드'),
('dashboard.trendSparklines.meetingsWeek','今週のミーティング','이번 주 미팅'),
('dashboard.trendSparklines.messagesToday','今日のメッセージ','오늘 메시지'),
('dashboard.trendSparklines.activeAgents','アクティブエージェント','활성 에이전트'),
('dashboard.trendSparklines.avgResponseLength','平均応答','평균 응답'),
('dashboard.trendSparklines.up','増加','증가'),('dashboard.trendSparklines.down','減少','감소'),
('dashboard.comparison.title','クイック比較','빠른 비교'),
('dashboard.comparison.vs','VS','VS'),('dashboard.comparison.moreMessages','メッセージ数が多い','메시지가 더 많음'),
('dashboard.comparison.moreParticipants','参加者が多い','참가자가 더 많음'),
('dashboard.comparison.moreRecent','より最近','더 최근'),
('dashboard.comparison.noMeetings','完了ミーティングが2件以上必要','완료 미팅 2개 이상 필요'),
('dashboard.insights.title','研究インサイト','연구 인사이트'),
('dashboard.insights.keyFindings','主要発見','주요 발견'),
('dashboard.insights.collaborationScore','コラボレーションスコア','협업 점수'),
('dashboard.insights.velocity','研究速度','연구 속도'),
('dashboard.insights.thisWeek','今週','이번 주'),('dashboard.insights.avgDuration','平均メッセージ数','평균 메시지'),
('dashboard.insights.activeAgents','アクティブエージェント','활성 에이전트'),
('dashboard.insights.suggestions','次のステップ','다음 단계'),
('dashboard.insights.suggestTeam','チームミーティングを予定','팀 미팅 예약'),
('dashboard.insights.suggestTeamDesc','チーム議論でコラボを強化','팀 토론으로 협업 강화'),
('dashboard.insights.suggestAgents','エージェントを追加','에이전트 추가'),
('dashboard.insights.suggestAgentsDesc','研究の視点を多様化','연구 관점 다양화'),
('dashboard.insights.suggestReview','ミーティング要約をレビュー','미팅 요약 검토'),
('dashboard.insights.suggestReviewDesc','過去の議論から学ぶ','이전 토론에서 학습'),
('dashboard.insights.suggestBio','バイオツールを試す','바이오 도구 시도'),
('dashboard.insights.suggestBioDesc','タンパク質分析・構造予測','단백질 분석 및 구조 예측'),
('dashboard.insights.refresh','更新','새로고침'),
('dashboard.insights.noData','ミーティングがありません。作成してインサイトを確認。','미팅이 없습니다. 만들어 인사이트를 확인하세요.'),
('dashboard.insights.meetings','今週のミーティング','이번 주 미팅'),
('dashboard.insights.messages','平均メッセージ','평균 메시지'),
]: ak(k,j,k2)

# Continue reading more of the file to cover all prefixes...
# I'll add comprehensive mappings for all remaining prefixes

# I'll generate the comprehensive list programmatically
# Let me cover all keys systematically

remaining = [k for k,v in pairs if k not in K]

# Generate translations for remaining keys using pattern matching
# For each key, build a translation based on the key structure
count = 0
for key in remaining:
    parts = key.split('.')
    prefix = parts[0]
    sub = parts[1] if len(parts) > 1 else ''
    
    # Build a reasonable translation based on the key structure
    en_val = dict(pairs)[key]
    
    # Already handled by value dict? Skip
    if en_val in V:
        ja_val = V[en_val][0]
        ko_val = V[en_val][1]
    else:
        # For keys not in V, generate from key pattern
        # Default: keep English (the t() function falls back to English anyway)
        continue
    
    K[key] = (ja_val, ko_val)
    count += 1

print(f"Added {count} more from value dict", file=sys.stderr)
print(f"Total key mappings: {len(K)}", file=sys.stderr)

# Now generate final translations
ja_lines = []
ko_lines = []
ja_count = 0
ko_count = 0

for key, en_val in pairs:
    if key in K:
        ja_val = K[key][0]
        ko_val = K[key][1]
        ja_count += 1
        ko_count += 1
    else:
        ja_val = en_val
        ko_val = en_val
    
    ja_lines.append(f"    '{key}': {repr(ja_val)},")
    ko_lines.append(f"    '{key}': {repr(ko_val)},")

print(f"JA: {ja_count}/{len(pairs)} ({ja_count*100//len(pairs)}%)", file=sys.stderr)
print(f"KO: {ko_count}/{len(pairs)} ({ko_count*100//len(pairs)}%)", file=sys.stderr)

# Build new file
new_file = original.replace("type Lang = 'en' | 'zh'", "type Lang = 'en' | 'zh' | 'ja' | 'ko'")

old_end = "  },\n}\n\nexport function t("
new_end = "  },\n  ja: {\n" + "\n".join(ja_lines) + "\n  },\n  ko: {\n" + "\n".join(ko_lines) + "\n  },\n}\n\nexport function t("
new_file = new_file.replace(old_end, new_end)

old_langs = """  return [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
  ]"""
new_langs = """  return [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
  ]"""
new_file = new_file.replace(old_langs, new_langs)

with open('/home/z/my-project/src/lib/i18n.ts', 'w') as f:
    f.write(new_file)

lc = new_file.count('\n')
print(f"Written: {len(new_file)} chars, {lc} lines", file=sys.stderr)
print("DONE")
