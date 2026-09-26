// English quotes and sentences for typing races
export const TYPING_TEXTS = [
  {
    id: 1,
    category: "technology",
    author: "Linus Torvalds",
    text: "Talk is cheap. Show me the code.",
  },
  {
    id: 2,
    category: "philosophy",
    author: "Steve Jobs",
    text: "The only way to do great work is to love what you do. If you have not found it yet, keep looking. Do not settle.",
  },
  {
    id: 3,
    category: "literature",
    author: "Ernest Hemingway",
    text: "There is nothing noble in being superior to your fellow man; true nobility is being superior to your former self.",
  },
  {
    id: 4,
    category: "technology",
    author: "Alan Kay",
    text: "The best way to predict the future is to invent it.",
  },
  {
    id: 5,
    category: "science",
    author: "Albert Einstein",
    text: "Learn from yesterday, live for today, hope for tomorrow. The important thing is not to stop questioning.",
  },
  {
    id: 6,
    category: "wisdom",
    author: "Marcus Aurelius",
    text: "You have power over your mind - not outside events. Realize this, and you will find strength.",
  },
  {
    id: 7,
    category: "literature",
    author: "F. Scott Fitzgerald",
    text: "So we beat on, boats against the current, borne back ceaselessly into the past.",
  },
  {
    id: 8,
    category: "technology",
    author: "Grace Hopper",
    text: "The most dangerous phrase in the language is: We have always done it this way.",
  },
  {
    id: 9,
    category: "philosophy",
    author: "Seneca",
    text: "Luck is what happens when preparation meets opportunity.",
  },
  {
    id: 10,
    category: "wisdom",
    author: "Confucius",
    text: "It does not matter how slowly you go as long as you do not stop.",
  },
  {
    id: 11,
    category: "technology",
    author: "Bill Gates",
    text: "Success is a lousy teacher. It seduces smart people into thinking they cannot lose.",
  },
  {
    id: 12,
    category: "literature",
    author: "Oscar Wilde",
    text: "Be yourself; everyone else is already taken.",
  },
  {
    id: 13,
    category: "technology",
    author: "Martin Fowler",
    text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
  },
  {
    id: 14,
    category: "philosophy",
    author: "Aristotle",
    text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
  },
  {
    id: 15,
    category: "wisdom",
    author: "Maya Angelou",
    text: "You may encounter many defeats, but you must not be defeated.",
  }
];

export function getRandomText(excludeId = null) {
  const filtered = excludeId ? TYPING_TEXTS.filter((t) => t.id !== excludeId) : TYPING_TEXTS;
  const index = Math.floor(Math.random() * filtered.length);
  return filtered[index] || TYPING_TEXTS[0];
}

export function getTextById(id) {
  return TYPING_TEXTS.find((t) => t.id === id) || TYPING_TEXTS[0];
}
