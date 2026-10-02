// Placeholder social proof. Generic role-based personas, not real
// customers - swap these for actual quotes (with permission) once you
// have them. Keeping this obviously generic is safer than inventing a
// name/photo/business that reads as a specific real person.
const QUOTES = [
  {
    quote: "The part that actually changed things: I stopped being the one who has to remember. It just goes out.",
    role: "Solo groomer, mobile van",
  },
  {
    quote: "We switched from a shared spreadsheet three staff kept forgetting to update. Rebookings went up within the first month.",
    role: "Owner, 4-chair grooming salon",
  },
  {
    quote: "Clients like getting a text instead of a call they have to pick up mid-appointment.",
    role: "Groomer & shop manager",
  },
];

export default function Testimonials() {
  return (
    <div className="pd-quotes">
      {QUOTES.map((t) => (
        <figure className="pd-quote-card" key={t.role}>
          <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
          <figcaption>{t.role}</figcaption>
        </figure>
      ))}
    </div>
  );
}
