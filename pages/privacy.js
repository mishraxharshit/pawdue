import MarketingNav from "../components/MarketingNav";
import SiteFooter from "../components/SiteFooter";

export default function Privacy() {
  return (
    <div className="pd-landing">
      <div className="pd-shell">
        <MarketingNav />
        <div className="pd-content">
          <h1 className="pd-display">Privacy policy</h1>
          <p className="pd-content-updated">Last updated: September 2026</p>

          <p>
            PawDue helps groomers keep track of when each dog is due for its next groom, and
            sends reminders to owners on the groomer&apos;s behalf. This page explains what
            information we collect to make that work, and how it&apos;s used.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>Account details for the groomer using PawDue: name, email, and login credentials.</li>
            <li>Dog and owner records the groomer enters: dog name, breed, owner name, and a phone number or email used only to send grooming reminders.</li>
            <li>Booking and reminder activity, such as when a reminder was sent and whether a rebooking link was used.</li>
            <li>Basic billing information when a groomer upgrades to a paid plan, handled by our payment processor rather than stored on our own servers.</li>
          </ul>

          <h2>How it&apos;s used</h2>
          <p>
            Owner contact details are used only to deliver the grooming reminders a groomer sets
            up in their own account — never sold, and never used for unrelated marketing.
            Account and usage data helps us keep the service running reliably and improve it
            over time.
          </p>

          <h2>Who can see a dog&apos;s data</h2>
          <p>
            Each groomer&apos;s dog and owner records are private to that groomer&apos;s account.
            We don&apos;t share one groomer&apos;s client list with another.
          </p>

          <h2>Data retention</h2>
          <p>
            Records are kept for as long as an account is active. A groomer can delete a dog
            record at any time from their dashboard, or ask us to close the account entirely.
          </p>

          <h2>Third-party services</h2>
          <p>
            Reminders are delivered by email through our email provider, with WhatsApp&apos;s
            and Twilio&apos;s messaging infrastructure available as optional backup channels.
            Payments are processed by our billing provider. These providers only receive the
            minimum information needed to deliver a message or process a payment.
          </p>

          <h2>Questions</h2>
          <p>
            For anything not covered here, reach out any time at{" "}
            <a href="mailto:hello@pawdue.app">hello@pawdue.app</a> or through the{" "}
            <a href="/feedback">feedback page</a>.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
