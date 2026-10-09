// Seeds the five launch Pusheen trivia quizzes and their 50 questions.
// Idempotent: if any quiz already exists, the seed does nothing.
// Run with: npm run seed   (after npm run migrate)
require('dotenv').config();
const { pool } = require('./index');

const QUIZZES = [
  {
    title: "Meet Pusheen",
    description: "The character herself: species, look, name, favorite things, and her themed alter-egos.",
    questions: [
      { prompt: "What kind of animal is Pusheen?", a: "a rabbit", b: "a cat", c: "a dog", d: "a hamster", correct: "B" },
      { prompt: "What color is Pusheen?", a: "pink", b: "orange", c: "gray", d: "black", correct: "C" },
      { prompt: "According to her official bio, Pusheen is a ___ cat.", a: "genderless", b: "male", c: "unknown", d: "female", correct: "D" },
      { prompt: "Pusheen's name comes from “puisín,” the word for kitten in which language?", a: "French", b: "Scottish Gaelic", c: "Irish", d: "Welsh", correct: "C",
        explanation: "Claire Belton's family used “puisín,” the Irish word for kitten, as an affectionate nickname." },
      { prompt: "Pusheen is a plump gray ___ cat.", a: "Siamese", b: "tabby", c: "Persian", d: "calico", correct: "B" },
      { prompt: "Pusheen's official bio says she loves blogging, snacking, and what else?", a: "going on adventures", b: "swimming", c: "gardening", d: "driving", correct: "A" },
      { prompt: "What is the unicorn version of Pusheen called?", a: "Pusheenicorn", b: "Uni-pusheen", c: "Pusheena", d: "Magic Pusheen", correct: "A" },
      { prompt: "What is the mermaid version of Pusheen called?", a: "Purrmaid", b: "Sea-pusheen", c: "Pusheenie", d: "Splashy", correct: "A" },
      { prompt: "In the comics, the dinosaur version of Pusheen is called what?", a: "Pusheenosaurus Rex", b: "Pushee-Rex", c: "Dino-pusheen", d: "Pusheenadon", correct: "A" },
      { prompt: "Pusheen's official birthday is celebrated on which date?", a: "January 18", b: "February 18", c: "March 18", d: "February 8", correct: "B",
        explanation: "The brand celebrates Pusheen's birthday every year on February 18." }
    ]
  },
  {
    title: "Pusheen's Family Tree",
    description: "Pusheen's family: parents Sunflower and Biscuit, sister Stormy, brother Pip, and the real cat behind the character.",
    questions: [
      { prompt: "What is Pusheen's mother's name?", a: "Sunflower", b: "Biscuit", c: "Daisy", d: "Petunia", correct: "A" },
      { prompt: "What is Pusheen's father's name?", a: "Muffin", b: "Waffles", c: "Biscuit", d: "Toast", correct: "C" },
      { prompt: "Who is Pusheen's little sister and best friend?", a: "Stormy", b: "Misty", c: "Cloudy", d: "Rainy", correct: "A" },
      { prompt: "Who is Pusheen's little brother?", a: "Pim", b: "Pip", c: "Pat", d: "Perky", correct: "B" },
      { prompt: "What color is Pip's fur?", a: "gray", b: "white", c: "black", d: "orange", correct: "C" },
      { prompt: "Which family member does Stormy idolize?", a: "her mom", b: "Pusheen", c: "her dad", d: "Pip", correct: "B" },
      { prompt: "Stormy tries her best to be a role model to whom?", a: "Pip", b: "Sloth", c: "Bo", d: "Cheek", correct: "A" },
      { prompt: "Stormy's official hobbies are adventuring, intellectual pursuits, and what?", a: "napping", b: "baking", c: "grooming herself", d: "blogging", correct: "C" },
      { prompt: "The real cat Pusheen is based on lives with the creator's parents in which U.S. state?", a: "Oregon", b: "Washington", c: "Illinois", d: "Iowa", correct: "C",
        explanation: "This is a trap — the cat lives in the town of Oregon, Illinois, not the state of Oregon." },
      { prompt: "Which family member's name doubles as a breakfast food?", a: "Sunflower", b: "Stormy", c: "Pip", d: "Biscuit", correct: "D" }
    ]
  },
  {
    title: "Pusheen's Pals",
    description: "Pusheen's non-cat friends: Sloth, Bo, and Cheek, plus original-comic trivia.",
    questions: [
      { prompt: "Sloth is what kind of animal?", a: "a sloth", b: "a dog", c: "a hamster", d: "a parakeet", correct: "A" },
      { prompt: "Bo is what kind of animal?", a: "a parakeet", b: "a hamster", c: "a squirrel", d: "a rabbit", correct: "A" },
      { prompt: "Cheek is what kind of animal?", a: "a parakeet", b: "a mouse", c: "a hamster", d: "a guinea pig", correct: "C" },
      { prompt: "What color is Cheek the hamster?", a: "yellow", b: "pink", c: "blue", d: "white", correct: "A" },
      { prompt: "Cheek's favorite hobby is baking in his what?", a: "treehouse", b: "bakery", c: "miniature kitchen", d: "friends' kitchen", correct: "C" },
      { prompt: "Which of Pusheen's friends is thoughtful, quiet, and takes his time in all things?", a: "Bo", b: "Sloth", c: "Cheek", d: "Stormy", correct: "B" },
      { prompt: "Who does Cheek share his baked treats with?", a: "nobody", b: "only Pusheen", c: "his larger animal friends", d: "his family", correct: "C" },
      { prompt: "According to his official bio, what hasn't Cheek noticed about his creations?", a: "they're too salty", b: "they're bite-sized", c: "they're burnt", d: "they're store-bought", correct: "B",
        explanation: "His bio notes he hasn't noticed his creations are bite-sized, and everyone is too nice to point it out." },
      { prompt: "Sloth, Bo, and Cheek are described as Pusheen's friends that are not what?", a: "cats", b: "family members", c: "pets", d: "fictional", correct: "C",
        explanation: "Wikipedia describes them as Pusheen's “non-pet friends.”" },
      { prompt: "In the original Everyday Cute comics, the creators' dog was named what?", a: "Bo", b: "Cheek", c: "Biscuit", d: "Carm", correct: "D",
        explanation: "Carm (short for “Carmen”) was Claire Belton and Andrew Duff's real dog, who appeared alongside Pusheen in early comics." }
    ]
  },
  {
    title: "The Story of Pusheen",
    description: "The creator Claire Belton and the brand's history: origins, books, and rise to fame.",
    questions: [
      { prompt: "Who created Pusheen?", a: "Kate Beaton", b: "Claire Belton", c: "Liz Climo", d: "Sarah Andersen", correct: "B" },
      { prompt: "Pusheen was co-created by Claire Belton and which collaborator?", a: "Andrew Duff", b: "Andrew Bell", c: "Andrew Lee", d: "Andrew Kim", correct: "A" },
      { prompt: "In what year did Pusheen first appear?", a: "2008", b: "2009", c: "2010", d: "2012", correct: "C" },
      { prompt: "On what website did Pusheen first appear?", a: "Everyday Cute", b: "Pusheen.com", c: "Cute Overload", d: "Cat Cartoons", correct: "A" },
      { prompt: "What was the first comic strip featuring Pusheen called?", a: "Pusheen Life", b: "Pusheen Things", c: "Everyday Pusheen", d: "Pusheen Tales", correct: "B",
        explanation: "Pusheen debuted in May 2010 in the strip “Pusheen Things” on Everyday Cute." },
      { prompt: "What comic collection did Claire Belton publish in 2013?", a: "I Am Pusheen the Cat", b: "Pusheen at Home", c: "The Pusheen Book", d: "Meow: A Pusheen Story", correct: "A" },
      { prompt: "What is the title of the 2021 sequel book?", a: "Pusheen's Big Adventure", b: "The Many Lives of Pusheen the Cat", c: "I Am Still Pusheen", d: "Pusheen Forever", correct: "B" },
      { prompt: "Pusheen became hugely famous through sticker sets on which platform?", a: "Instagram", b: "Twitter", c: "Facebook", d: "Snapchat", correct: "C" },
      { prompt: "Pusheen stickers first launched on which mobile platform in April 2013?", a: "iOS", b: "Android", c: "Windows Phone", d: "BlackBerry", correct: "B",
        explanation: "The Facebook sticker feature with Pusheen arrived on Android in April 2013 and on the main Facebook site later that year." },
      { prompt: "Pusheen Corp is headquartered in which U.S. city?", a: "New York", b: "Seattle", c: "Portland", d: "Chicago", correct: "D" }
    ]
  },
  {
    title: "Pusheen Merch & Media Mania",
    description: "The business side: plush, subscription boxes, retail, and social media presence.",
    questions: [
      { prompt: "Which company makes the official Pusheen plush toys?", a: "Build-A-Bear", b: "GUND", c: "Ty", d: "Jellycat", correct: "B" },
      { prompt: "The Pusheen Box is what kind of product?", a: "a mystery subscription box", b: "a lunch box", c: "a toy chest", d: "a litter box", correct: "A" },
      { prompt: "What is the Pusheen Box version made for your cat called?", a: "Meow Kit", b: "Cat Kit", c: "Kitty Box", d: "Paws Box", correct: "B" },
      { prompt: "About how many items come in each Pusheen Box?", a: "3–5", b: "5–7", c: "7–10", d: "10–15", correct: "C",
        explanation: "Each box contains 7–10 exclusive items with a total value over $100." },
      { prompt: "All items inside a Pusheen Box are what?", a: "secondhand", b: "exclusive to the box", c: "free samples", d: "handmade by fans", correct: "B" },
      { prompt: "Which pet-focused retail chain has carried Pusheen merchandise?", a: "PetSmart", b: "Petco", c: "Chewy", d: "Pet Supplies Plus", correct: "B" },
      { prompt: "Which major bookstore chain has sold Pusheen merchandise?", a: "Books-A-Million", b: "Waterstones", c: "Barnes & Noble", d: "Half Price Books", correct: "C" },
      { prompt: "Besides plush, what kind of collectible figures are part of the Pusheen line?", a: "vinyl figures", b: "wooden figures", c: "clay figures", d: "glass figures", correct: "A" },
      { prompt: "Which blogging platform helped Pusheen's GIFs spread widely in the early days?", a: "Reddit", b: "Vine", c: "Tumblr", d: "Pinterest", correct: "C" },
      { prompt: "In 2017, Pusheen Corp acquired office space in which Chicago suburb?", a: "Naperville", b: "Evanston", c: "Oak Park", d: "Park Ridge", correct: "D",
        explanation: "The company's workspace for artists and photographers is in Park Ridge, Illinois." }
    ]
  }
];

(async () => {
  const existing = await pool.query('SELECT 1 FROM quizzes LIMIT 1');
  if (existing.rowCount) {
    console.log('Quizzes already exist - seed skipped.');
    await pool.end();
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const quiz of QUIZZES) {
      const ins = await client.query(
        "INSERT INTO quizzes (title, description, publication_state) VALUES ($1, $2, 'published') RETURNING id",
        [quiz.title, quiz.description]
      );
      const quizId = ins.rows[0].id;
      let ordering = 1;
      for (const q of quiz.questions) {
        await client.query(
          'INSERT INTO questions ' +
            '(quiz_id, prompt, choice_a, choice_b, choice_c, choice_d, correct_choice, explanation, ordering) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [quizId, q.prompt, q.a, q.b, q.c, q.d, q.correct, q.explanation || null, ordering++]
        );
      }
      console.log('Seeded "' + quiz.title + '" with ' + quiz.questions.length + ' questions.');
    }
    await client.query('COMMIT');
    const total = QUIZZES.reduce((n, q) => n + q.questions.length, 0);
    console.log('Seed complete: ' + QUIZZES.length + ' quizzes, ' + total + ' questions.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
