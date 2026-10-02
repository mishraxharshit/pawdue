import { useState } from "react";

export default function Faq({ items }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="pd-faq">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div className={`pd-faq-item ${isOpen ? "open" : ""}`} key={item.q}>
            <button
              className="pd-faq-q"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <span className="pd-faq-chevron">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && <div className="pd-faq-a">{item.a}</div>}
          </div>
        );
      })}
    </div>
  );
}
