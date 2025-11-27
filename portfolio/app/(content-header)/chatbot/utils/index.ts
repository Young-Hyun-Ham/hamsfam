// chatbot/utils/index.ts

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}


export {
  cn,
};