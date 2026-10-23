// Blog content lives here as plain data so it ships with the build (no CMS,
// no extra dependency). Block types: h2, h3, p, ul, ol, quote, callout, img,
// video, table, cta. Inline links in text use [label](/path).
//
// Rules for everything written here: no invented statistics, no fake
// customers, no claims PawDue cannot back up. Advice is practical and says
// when it is a starting point rather than a rule.

export const SITE = "https://pawdue.pet";
export const AUTHOR = "PawDue";

export const POSTS = [
  {
    slug: "why-grooming-clients-drift-away",
    title: "Why Grooming Clients Drift Away and How to Win Them Back",
    description:
      "Most regulars do not leave on purpose, they just forget. Here is why grooming clients drift away and six simple ways dog groomers can bring them back.",
    category: "Client retention",
    date: "2026-10-23",
    readMinutes: 6,
    hero: { name: "trim", alt: "A groomer scissoring a Shih Tzu on the grooming table" },
    og: "/media/og-why-clients-drift.jpg",
    excerpt: "Most regulars do not leave on purpose. They forget, life gets busy, and nobody asks. Here is what actually helps.",
    blocks: [
      { type: "p", text: "Almost every groomer has the same quiet worry: a regular who was coming every six weeks, and then simply stopped. No complaint, no goodbye. One day you notice you have not seen the dog in four months." },
      { type: "p", text: "The good news is that, in most cases, it is not about the quality of your work. It is about timing and memory. Below are the usual reasons it happens and six things you can do about it, none of which need expensive software." },
      { type: "h2", id: "why-it-happens", text: "Why regulars drift away" },
      { type: "ul", items: [
        "**Nobody booked the next visit.** If the owner leaves without a date in the diary, the next groom depends entirely on them remembering.",
        "**Life gets busy.** Work, kids, holidays and a dog that still looks fine all push grooming down the list.",
        "**The coat grows slowly.** Owners rarely notice the exact week when a coat tips from fresh to overdue.",
        "**Nobody reminded them.** Many owners are happy to rebook. They just never get the nudge.",
        "**They tried someone else once.** A convenient slot elsewhere can turn into a new habit.",
      ] },
      { type: "quote", text: "Most clients who disappear were not unhappy. They were never reminded." },
      { type: "img", src: "yorkie", alt: "A Yorkshire Terrier being combed and scissored by a groomer", caption: "A great groom is only half of retention. The other half is the follow-up." },
      { type: "h2", id: "six-ways", text: "Six ways to bring them back" },
      { type: "h3", text: "1. Rebook before they leave" },
      { type: "p", text: "The simplest habit in the business. While the owner is at the desk, offer the next date based on the dog's coat, for example \"Let's pencil in six weeks from today.\" A booked date beats any reminder." },
      { type: "h3", text: "2. Remind them before the dog is overdue" },
      { type: "p", text: "Send a first note one to two weeks before the due date, while there is still room in your calendar. It feels like a service, not a chase." },
      { type: "h3", text: "3. Make rebooking one tap" },
      { type: "p", text: "If the owner has to call, wait for a reply and negotiate times, many will put it off. A link that shows your open times removes most of that friction." },
      { type: "h3", text: "4. Follow up once or twice, then stop" },
      { type: "p", text: "A reminder, a short follow-up and one last gentle note is plenty. More than that starts to feel like pressure, and it can push a friendly client away." },
      { type: "h3", text: "5. Keep a list of who has gone quiet" },
      { type: "p", text: "A simple list of dogs that are well past their due date lets you see the problem instead of guessing. Check it once a week. Even a notebook works if you keep it up to date." },
      { type: "h3", text: "6. Send a personal message to the quiet ones" },
      { type: "p", text: "For clients who have gone a long way overdue, an automatic email is not enough. A short, warm, personal message from you often works better: mention the dog by name and ask how they are doing." },
      { type: "callout", title: "A message you can adapt", text: "\"Hi Sarah, it has been a while since we saw Bella and I was thinking of her! Whenever you are ready for her next groom, I have a few openings this month. No pressure at all.\"" },
      { type: "h2", id: "what-to-track", text: "What to track so nobody slips through" },
      { type: "p", text: "You only need four things per dog: the owner's contact, the last groom date, how often that dog usually comes, and the date it is next due. From those you can see who is on track, who is due soon and who is overdue." },
      { type: "video", name: "clippers", alt: "Clippers running along a dog's coat", caption: "Your hands are busy at the table, so the remembering is best done by something else." },
      { type: "p", text: "That is exactly the job [PawDue](/) was built for: it keeps that list for you, emails owners a friendly reminder with a link to rebook, and shows which clients have gone quiet so you can message them yourself. It is free for up to 30 dogs, and you can try it without a card." },
      { type: "cta" },
    ],
  },
  {
    slug: "grooming-rebooking-reminder-message-examples",
    title: "Grooming Rebooking Reminder Messages: 8 Examples to Copy",
    description:
      "Copy-and-edit rebooking reminder messages for dog groomers: first reminder, follow-up, last nudge and win-back notes for text, WhatsApp and email.",
    category: "Templates",
    date: "2026-10-23",
    readMinutes: 5,
    hero: { name: "yorkie", alt: "A Yorkshire Terrier being combed and scissored on the grooming table" },
    og: "/media/og-reminder-messages.jpg",
    excerpt: "Eight short messages for every stage: first reminder, follow-up, last nudge and a warm win-back note.",
    blocks: [
      { type: "p", text: "A good reminder is short, warm and makes the next step obvious. Below are eight messages you can copy and edit, grouped by when you would send them. Replace the names and details, and keep your own voice." },
      { type: "h2", id: "principles", text: "Four rules for any reminder" },
      { type: "ul", items: [
        "**Use the dog's name.** It is the first thing the owner cares about.",
        "**Keep it to two or three lines.** Owners read these on their phone between other things.",
        "**Say what to do next.** A booking link or \"reply with a day that suits you\".",
        "**Sound like you.** A reminder that sounds like a form letter gets ignored.",
      ] },
      { type: "h2", id: "first-reminder", text: "First reminder (one to two weeks before due)" },
      { type: "callout", title: "1. Friendly heads-up", text: "\"Hi Sarah! Bella will be due for her next groom around [date]. I have a few spots open, here is my booking link: [link]\"" },
      { type: "callout", title: "2. Short and casual (text or WhatsApp)", text: "\"Hi Sarah, Bella's due for a groom soon! Want me to book her in? 🐾\"" },
      { type: "img", src: "maltese", alt: "A freshly groomed white Maltese looking at the camera", caption: "A fresh groom is the best reminder: send the next date while it still looks great." },
      { type: "h2", id: "follow-up", text: "Follow-up (around the due date, if they have not booked)" },
      { type: "callout", title: "3. Gentle follow-up", text: "\"Hi Sarah, just checking in on Bella's next groom. I have openings this week and next if either suits you: [link]\"" },
      { type: "callout", title: "4. Make it easy to say yes", text: "\"Hi Sarah, would Thursday or Saturday work for Bella? Just reply with a day and I will sort it.\"" },
      { type: "h2", id: "last-nudge", text: "Last nudge (a few days after due)" },
      { type: "callout", title: "5. One last, no pressure", text: "\"Hi Sarah, I do not want Bella's coat to get tangled, so here is my link in case now is a good time: [link]. Either way, hope you both are well!\"" },
      { type: "callout", title: "6. Coat-care angle", text: "\"Hi Sarah, it has been a little while since Bella's last groom. Her coat will be easier to keep comfortable if we do it soon. Happy to fit her in: [link]\"" },
      { type: "h2", id: "win-back", text: "Win-back (clients who have gone a long way overdue)" },
      { type: "callout", title: "7. Warm and personal", text: "\"Hi Sarah, I was thinking of Bella the other day! It has been a while. Whenever you are ready, I would love to see her again. No pressure at all.\"" },
      { type: "callout", title: "8. Offer a fresh start", text: "\"Hi Sarah, I have a few openings next week and thought of Bella. If you would like her booked in, just say the word.\"" },
      { type: "h2", id: "timing", text: "Timing and channel" },
      { type: "p", text: "Send during normal waking hours, not late at night. Use the channel your client already uses with you: many owners prefer text or WhatsApp, others like email. Only message people who have agreed to hear from you, always honour a request to stop, and check the messaging rules in your country." },
      { type: "video", name: "scissors", alt: "Scissors trimming a dog's fur", caption: "Reminders work best when they take seconds to send, not minutes." },
      { type: "p", text: "If you would rather not write and send these by hand, [PawDue](/) emails the first three automatically (at most three per cycle, and they stop once the owner books). For clients who have gone quiet, its Message button opens WhatsApp with a note already written, and you tap send from your own number." },
      { type: "cta" },
    ],
  },
  {
    slug: "how-often-should-dogs-be-groomed-by-breed",
    title: "How Often to Groom Dogs: Intervals by Breed for Groomers",
    description:
      "Suggested starting rebooking intervals by breed and coat type for dog groomers, plus the factors that should make you shorten or lengthen them.",
    category: "Grooming schedules",
    date: "2026-10-23",
    readMinutes: 5,
    hero: { name: "maltese", alt: "A freshly groomed white Maltese looking at the camera" },
    og: "/media/og-grooming-intervals.jpg",
    excerpt: "A starting point for how often each breed usually comes back, and what should make you adjust it for a particular dog.",
    blocks: [
      { type: "p", text: "Clients often ask \"how often should I bring them in?\" and the honest answer is: it depends on the dog. Still, having a sensible starting interval for each breed makes your rebooking conversations faster and more consistent." },
      { type: "callout", title: "Important", text: "The numbers below are typical starting points, not rules. You know each coat, owner and lifestyle better than any chart, so adjust freely." },
      { type: "h2", id: "table", text: "Typical starting intervals" },
      { type: "table", head: ["Breed or coat", "Interval"], rows: "BREED_TABLE" },
      { type: "p", text: "These are the starting intervals PawDue uses when you add a dog of that breed. You can change the weeks for any individual dog." },
      { type: "h2", id: "adjust", text: "When to shorten the interval" },
      { type: "ul", items: [
        "Coats that mat easily or tangle between visits",
        "Long or heavily styled cuts that grow out visibly",
        "Dogs that swim, run through mud or are outdoors a lot",
        "Owners who brush rarely at home",
        "Dogs with skin issues that benefit from regular bathing (check with the owner's vet)",
      ] },
      { type: "h2", id: "lengthen", text: "When a longer interval is fine" },
      { type: "ul", items: [
        "Short, smooth coats with little shedding",
        "Dogs kept in a short, low-maintenance trim",
        "Owners who brush and bathe consistently at home",
      ] },
      { type: "img", src: "poodle-legs", alt: "A groomer shaping the legs of a Poodle on the table", caption: "Curly, fast-growing coats are the ones that need the tightest rebooking rhythm." },
      { type: "h2", id: "use", text: "How to use intervals in your business" },
      { type: "ol", items: [
        "At checkout, suggest the next date using the dog's interval, then write it down or book it.",
        "Record the interval for each dog so a reminder can go out before it is due.",
        "Review a dog's interval whenever the coat or the cut changes.",
      ] },
      { type: "p", text: "[PawDue](/) does the recording and reminding for you: add the dog, pick the breed, and it works out the due date and emails the owner before it arrives. You can try the date maths on the [homepage](/) with any breed." },
      { type: "cta" },
    ],
  },
  {
    slug: "weekly-routine-to-track-lapsed-grooming-clients",
    title: "A 10-Minute Weekly Routine to Track Lapsed Grooming Clients",
    description:
      "A simple weekly routine for dog groomers to find overdue clients, send personal messages and keep the diary full, with or without software.",
    category: "Client retention",
    date: "2026-10-23",
    readMinutes: 4,
    hero: { name: "salon-spray", alt: "A groomer spraying a standing dark Poodle in a bright salon" },
    og: "/media/og-weekly-routine.jpg",
    excerpt: "Ten minutes, once a week, to make sure nobody quietly slips away. Works with a notebook, a spreadsheet or software.",
    blocks: [
      { type: "p", text: "Quiet clients are easy to miss because nothing happens. No cancellation, no complaint, just an empty slot where a regular used to be. A short weekly routine turns that invisible problem into a short list you can act on." },
      { type: "h2", id: "routine", text: "The routine" },
      { type: "ol", items: [
        "**Pick a fixed time.** Same day each week, for example Monday morning before your first dog. Set a reminder so it actually happens.",
        "**List who is due soon.** Dogs due in the next two weeks. These get a friendly first reminder.",
        "**List who is overdue.** Dogs past their due date. These get a follow-up.",
        "**List who has gone quiet.** Dogs a long way past due, for example more than a month. These get a personal message from you.",
        "**Send the messages.** Two or three lines each, using the dog's name.",
        "**Note the result.** Booked, replied, no answer. After one more try, let them go with a warm door left open.",
      ] },
      { type: "img", src: "tail", alt: "A groomer brushing a Shih Tzu's tail on the table with a Poodle behind", caption: "Ten minutes of follow-up protects hours of regular work." },
      { type: "h2", id: "what-counts", text: "What counts as \"quiet\"?" },
      { type: "p", text: "There is no universal number. A reasonable approach is to treat a dog as quiet once it is well past its usual interval, for example a month or more overdue, and then adjust to your own business. In PawDue, a dog moves to the Lapsed list when it is more than 30 days overdue." },
      { type: "h2", id: "tools", text: "Do you need software for this?" },
      { type: "p", text: "No. A notebook or spreadsheet with four columns (owner contact, last groom date, interval, due date) is enough to start. Software becomes useful when the list grows, or when you want reminders and booking links to go out without you thinking about it." },
      { type: "video", name: "paws", alt: "A dog's paws on the grooming table", caption: "The table is where your attention should be. The list should look after itself." },
      { type: "p", text: "[PawDue](/) keeps this list for you: it shows who is on track, who is due soon, who is overdue and who is lapsed, emails owners automatically, and gives you a Message button for the lapsed ones. It is free for up to 30 dogs." },
      { type: "cta" },
    ],
  },
];

export function getPost(slug) {
  return POSTS.find((p) => p.slug === slug) || null;
}

export function relatedPosts(slug, n = 2) {
  return POSTS.filter((p) => p.slug !== slug).slice(0, n);
}

export function formatDate(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
