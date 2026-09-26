// Fighting Game Skill Definitions & Typing Prompts
export const FIGHTER_SKILLS = [
  {
    id: "light",
    key: "1",
    nameKo: "약공격 (Jab)",
    nameEn: "Light Jab",
    icon: "🥊",
    type: "attack",
    damage: 12,
    difficulty: "easy",
    descKo: "빠른 잽으로 상대의 틈을 노립니다.",
    descEn: "A swift jab to poke through enemy defenses.",
    prompts: [
      { text: "PUNCH", ko: "주먹" },
      { text: "KICK", ko: "발차기" },
      { text: "SWIFT", ko: "신속" },
      { text: "STRIKE", ko: "타격" },
      { text: "FLASH", ko: "섬광" },
      { text: "DODGE", ko: "회피" },
      { text: "RUSH", ko: "돌진" },
      { text: "COMBO", ko: "콤보" },
    ],
  },
  {
    id: "heavy",
    key: "2",
    nameKo: "강공격 (Smash)",
    nameEn: "Heavy Smash",
    icon: "💥",
    type: "attack",
    damage: 26,
    difficulty: "medium",
    descKo: "강력한 일격으로 상대에게 큰 피해를 입힙니다.",
    descEn: "A crushing blow dealing massive damage.",
    prompts: [
      { text: "Strike hard with precision and power.", ko: "정확하고 강력하게 일격을 날려라." },
      { text: "Break through the defense with brute force.", ko: "압도적인 힘으로 상대의 방어를 부숴라." },
      { text: "Feel the impact of an explosive critical hit.", ko: "폭발적인 치명타의 타격감을 느껴라." },
      { text: "Unleash all energy into a devastating blow.", ko: "모든 에너지를 실어 파괴적인 일격을 가하라." },
    ],
  },
  {
    id: "guard",
    key: "3",
    nameKo: "방어 & 반격 (Guard)",
    nameEn: "Guard & Parry",
    icon: "🛡️",
    type: "guard",
    durationMs: 4000,
    reflectDamage: 8,
    difficulty: "easy",
    descKo: "4초간 방어 태세를 취해 데미지를 70% 줄이고 반격합니다.",
    descEn: "Take a defensive stance for 4s, reducing damage by 70% and parrying back.",
    prompts: [
      { text: "BLOCK", ko: "방어" },
      { text: "SHIELD", ko: "방패" },
      { text: "PARRY", ko: "쳐내기" },
      { text: "DEFEND", ko: "수비" },
      { text: "ABSORB", ko: "흡수" },
    ],
  },
  {
    id: "heal",
    key: "4",
    nameKo: "호흡 & 회복 (Focus)",
    nameEn: "Focus & Heal",
    icon: "💚",
    type: "heal",
    healAmount: 16,
    difficulty: "medium",
    descKo: "깊은 호흡으로 정신을 가다듬고 체력을 회복합니다.",
    descEn: "Catch your breath and restore health.",
    prompts: [
      { text: "Breathe in deep, center your inner energy.", ko: "깊게 숨을 들이쉬고 내면의 기운을 모아라." },
      { text: "Focus your mind, rejuvenate and stand tall.", ko: "마음을 집중하고 기력을 회복하여 당당히 서라." },
      { text: "True warriors endure pain and rise again.", ko: "진정한 투사는 고통을 견디고 다시 일어선다." },
    ],
  },
];

export const ULTIMATE_SKILL = {
  id: "ultimate",
  nameKo: "궁극기: 진공 파동격 (Ultimate Finisher)",
  nameEn: "Ultimate: Dragon Meteor Smash",
  icon: "⚡",
  type: "ultimate",
  damage: 48,
  prompts: [
    {
      text: "Victory belongs to the most persevering warrior in battle!",
      ko: "승리는 전장에서 가장 끈기 있게 인내하는 투사에게 속한다!",
    },
    {
      text: "Channel the raging fire within and unleash the ultimate dragon strike!",
      ko: "타오르는 내면의 불꽃을 모아 궁극의 용의 일격을 해방하라!",
    },
    {
      text: "There is no defeat until you admit it in your own heart!",
      ko: "스스로 마음속으로 인정하기 전까지 진정한 패배란 없다!",
    },
  ],
};

export function getRandomPrompt(skill, lang = "en") {
  const list = skill.prompts;
  const picked = list[Math.floor(Math.random() * list.length)];
  return picked.text;
}

export function getRandomUltimatePrompt(lang = "en") {
  const list = ULTIMATE_SKILL.prompts;
  const picked = list[Math.floor(Math.random() * list.length)];
  return picked.text;
}
