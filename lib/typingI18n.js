// Internationalization (i18n) dictionary for Typing Race
export const TRANSLATIONS = {
  ko: {
    heroTitle: "🏎️ 타자 레이스 (Typing Race)",
    heroSubtitle: "실시간으로 경쟁하며 타자 속도(WPM)와 정확도를 겨뤄보세요.",
    soundOn: "🔊 효과음 ON",
    soundMuted: "🔇 음소거됨",
    leaderboardBtn: "🏆 명예의 전당",
    langBtn: "🌐 한국어",

    // Mode Tabs
    soloTab: "🚀 싱글 연습 (Solo AI Race)",
    multiTab: "👥 실시간 멀티 (WebRTC P2P)",
    nicknameLabel: "레이서 닉네임",
    nicknamePlaceholder: "닉네임을 입력하세요",
    soloDesc: "가상 AI 레이서(Bot Turbo)와 함께 1:1 레이스를 펼칩니다. 완주 후 기록을 명예의 전당에 바로 등록할 수 있습니다.",
    startSoloBtn: "레이스 시작하기 🏁",

    // Multiplayer
    hostTab: "방 만들기 (Host)",
    joinTab: "방 참가하기 (Join)",
    hostDesc: "방을 생성하면 초대 코드가 발급됩니다. 친구에게 코드를 공유해 함께 실시간 레이스를 즐기세요.",
    createRoomBtn: "방 만들기 & 대기실 입장",
    creatingRoom: "방 개설 중...",
    joinCodeLabel: "참가할 방 코드 (6자리)",
    joinPlaceholder: "예: ABC123",
    joinRoomBtn: "방 입장하기 🚀",
    joiningRoom: "방 접속 중...",
    roomCodeTitle: "방 초대 코드",
    copyLinkBtn: "초대 링크 복사 🔗",
    copyCodeBtn: "코드 복사 📋",
    linkCopiedAlert: "초대 링크가 복사되었습니다! 새 탭이나 다른 브라우저에 붙여넣으세요:\n",
    codeCopiedAlert: "방 코드가 클립보드에 복사되었습니다: ",
    waitingRacers: (count) => `대기 중인 레이서 (${count}명)`,
    hostBadge: "(방장)",
    startMultiBtn: "모두 모였으면 레이스 시작! 🚦",
    waitingForHost: "방장이 레이스를 시작할 때까지 대기 중입니다...",

    // Engine
    strictBadge: "🛡️ 엄격 모드 (Strict)",
    statWpm: "WPM",
    statAcc: "정확도 (ACC)",
    statProg: "진행률",
    helpError: "⚠️ 오타가 발생했습니다! Backspace 키를 눌러 지운 후 계속 진행해주세요.",
    helpReady: "카운트다운이 끝나면 타이핑이 시작됩니다. 준비하세요!",
    helpTyping: "정확하고 빠르게 입력하세요! (화면을 클릭하면 포커스 유지)",

    // Track
    youTag: "YOU",
    botTag: "BOT",
    raceTrackHeader: "🏎️ RACE TRACK",
    finishHeader: "🏁 FINISH",

    // Result
    resultTitle: "🏁 레이스 완주!",
    resultSubtitle: "멋진 주행이었습니다! 최종 기록을 확인해보세요.",
    statFinalSpeed: "최종 속도",
    statFinalAcc: "타이핑 정확도",
    statFinalTime: "완주 시간",
    secondsSuffix: "초",
    nicknamePrefix: "닉네임: ",
    anonymous: "익명",
    submitScoreBtn: "🏆 리더보드에 내 기록 등록하기",
    submitting: "등록 중...",
    submitSuccess: "✅ 명예의 전당 리더보드에 성공적으로 등록되었습니다!",
    raceAgainBtn: "다시 레이스하기 🏎️",
    viewLeaderboardBtn: "리더보드 보기 🏆",

    // Modal
    modalTitle: "🏆 명예의 전당 (Leaderboard)",
    modalSubtitle: "최고의 타자 레이서 순위를 확인하세요.",
    totalRuns: "총 레이스 완주",
    maxSpeed: "역대 최고 속도",
    runsUnit: "회",
    allTimeTab: "전체 랭킹 (All-Time)",
    weeklyTab: "이번 주 랭킹 (Weekly)",
    rankCol: "순위",
    racerCol: "레이서",
    wpmCol: "WPM",
    accCol: "정확도",
    timeCol: "소요시간",
    loadingRankings: "랭킹 데이터를 불러오는 중...",
    emptyRankings: "아직 등록된 기록이 없습니다. 첫 레이서가 되어보세요!",

    // Main Game Switcher
    gameModeRace: "🏎️ 타자 레이스 (Race)",
    gameModeFighter: "🥊 타이핑 파이터 (Fighter)",

    // Fighter Section
    fighterHeroTitle: "🥊 타이핑 파이터 (Typing Fighter)",
    fighterHeroSubtitle: "단어와 문장을 빠르게 타이핑해 상대를 타격하고, 콤보를 모아 필살기로 K.O. 시키세요!",
    fighterSoloTab: "🥋 AI 배틀 (vs Shadow Fist)",
    fighterMultiTab: "⚔️ 1:1 실시간 결투 (P2P)",
    fighterSoloDesc: "체력 100의 단판 데스매치! AI 파이터를 상대로 기술을 구사하고 공격을 가드하며 승리하세요.",
    fighterStartBtn: "대전 시작 (FIGHT) 🥊",
    selectSkillPrompt: "시전할 기술을 선택하세요 (단축키 1~4번 또는 클릭):",
    ultimateReadyBanner: "⚡ 3콤보 달성! 궁극의 필살기 시전 가능! ⚡",
    castSkill: "시전",
    casting: "타이핑 중...",
    guardActiveNotice: "🛡️ 가드 활성화 중! (-70% 데미지 경감 & 카운터)",
    opponentAttacking: "⚠️ 상대가 공격 준비 중입니다! 가드로 방어하세요!",
    koYouWin: "🏆 YOU WIN! (K.O.)",
    koYouLose: "💀 YOU LOSE... (K.O.)",
    matchFinishedTitle: "결투 종료!",
    fighterRematchBtn: "다시 싸우기 🔄",
  },
  en: {
    heroTitle: "🏎️ Typing Race",
    heroSubtitle: "Compete in real-time typing races. Test your WPM and accuracy.",
    soundOn: "🔊 Sound ON",
    soundMuted: "🔇 Muted",
    leaderboardBtn: "🏆 Hall of Fame",
    langBtn: "🌐 English",

    // Mode Tabs
    soloTab: "🚀 Solo Practice (AI Race)",
    multiTab: "👥 Live Multiplayer (WebRTC)",
    nicknameLabel: "Racer Nickname",
    nicknamePlaceholder: "Enter your nickname",
    soloDesc: "Race 1v1 against an AI racer (Bot Turbo). Submit your score to the Hall of Fame upon completion.",
    startSoloBtn: "Start Race 🏁",

    // Multiplayer
    hostTab: "Create Room (Host)",
    joinTab: "Join Room",
    hostDesc: "Create a room and get an invite code. Share it with friends to race in real time.",
    createRoomBtn: "Create Room & Enter Lobby",
    creatingRoom: "Creating room...",
    joinCodeLabel: "Room Code (6 characters)",
    joinPlaceholder: "e.g. ABC123",
    joinRoomBtn: "Join Room 🚀",
    joiningRoom: "Connecting to room...",
    roomCodeTitle: "Room Invite Code",
    copyLinkBtn: "Copy Invite Link 🔗",
    copyCodeBtn: "Copy Code 📋",
    linkCopiedAlert: "Invite link copied! Paste it in another tab or share with a friend:\n",
    codeCopiedAlert: "Room code copied to clipboard: ",
    waitingRacers: (count) => `Waiting Racers (${count})`,
    hostBadge: "(Host)",
    startMultiBtn: "Start Race! 🚦",
    waitingForHost: "Waiting for host to start the race...",

    // Engine
    strictBadge: "🛡️ Strict Mode",
    statWpm: "WPM",
    statAcc: "Accuracy (ACC)",
    statProg: "Progress",
    helpError: "⚠️ Typo detected! Press Backspace to delete it before continuing.",
    helpReady: "Get ready! Typing starts when the countdown finishes.",
    helpTyping: "Type fast and accurately! (Click anywhere to focus)",

    // Track
    youTag: "YOU",
    botTag: "BOT",
    raceTrackHeader: "🏎️ RACE TRACK",
    finishHeader: "🏁 FINISH",

    // Result
    resultTitle: "🏁 Race Finished!",
    resultSubtitle: "Fantastic run! Check out your stats below.",
    statFinalSpeed: "Final Speed",
    statFinalAcc: "Accuracy",
    statFinalTime: "Completion Time",
    secondsSuffix: "s",
    nicknamePrefix: "Nickname: ",
    anonymous: "Anonymous",
    submitScoreBtn: "🏆 Submit Score to Leaderboard",
    submitting: "Submitting...",
    submitSuccess: "✅ Record successfully submitted to the Hall of Fame!",
    raceAgainBtn: "Race Again 🏎️",
    viewLeaderboardBtn: "View Leaderboard 🏆",

    // Modal
    modalTitle: "🏆 Hall of Fame (Leaderboard)",
    modalSubtitle: "Check out the fastest typing racers in the world.",
    totalRuns: "Total Races Run",
    maxSpeed: "All-Time Record",
    runsUnit: " races",
    allTimeTab: "All-Time Rankings",
    weeklyTab: "Weekly Rankings",
    rankCol: "Rank",
    racerCol: "Racer",
    wpmCol: "WPM",
    accCol: "Accuracy",
    timeCol: "Time",
    loadingRankings: "Loading rankings...",
    emptyRankings: "No records yet. Be the first to claim a spot!",

    // Main Game Switcher
    gameModeRace: "🏎️ Typing Race",
    gameModeFighter: "🥊 Typing Fighter",

    // Fighter Section
    fighterHeroTitle: "🥊 Typing Fighter",
    fighterHeroSubtitle: "Type words & sentences swiftly to strike, parry enemy blows, and trigger devastating ultimate finishers!",
    fighterSoloTab: "🥋 AI Battle (vs Shadow Fist)",
    fighterMultiTab: "⚔️ 1v1 Live Duel (P2P)",
    fighterSoloDesc: "Sudden Death Match with 100 HP! Pick your strikes, time your guards, and K.O. the AI opponent.",
    fighterStartBtn: "Start Fight (FIGHT) 🥊",
    selectSkillPrompt: "Select a skill to cast (Press 1~4 or Click):",
    ultimateReadyBanner: "⚡ 3 COMBOS REACHED! ULTIMATE FINISHER UNLOCKED! ⚡",
    castSkill: "Cast",
    casting: "Typing...",
    guardActiveNotice: "🛡️ Guard Active! (-70% Damage & Parry Counter)",
    opponentAttacking: "⚠️ Opponent is attacking! Guard to reduce damage!",
    koYouWin: "🏆 YOU WIN! (K.O.)",
    koYouLose: "💀 YOU LOSE... (K.O.)",
    matchFinishedTitle: "Match Finished!",
    fighterRematchBtn: "Rematch 🔄",
  },
};

export function getInitialLang() {
  if (typeof window === "undefined") return "en";
  const urlParam = new URLSearchParams(window.location.search).get("lang");
  if (urlParam === "ko" || urlParam === "en") return urlParam;
  const saved = localStorage.getItem("typing_lang");
  if (saved === "ko" || saved === "en") return saved;
  // If user browser language is Korean, default to ko, otherwise en
  const navLang = navigator.language || "";
  return navLang.toLowerCase().startsWith("ko") ? "ko" : "en";
}
