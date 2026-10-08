import MarketingNav from "../components/MarketingNav";
import SiteFooter from "../components/SiteFooter";

export default function Terms() {
  return (
    <div className="pd-landing">
      <div className="pd-shell">
        <MarketingNav />
        <div className="pd-content">
          <h1 className="pd-display">Terms &amp; conditions</h1>
          <p className="pd-content-updated">Last updated: September 2026</p>

          <p>
            These terms cover use of PawDue, a tool that tracks grooming schedules and sends
            reminders on a groomer&apos;s behalf. By creating an account, you agree to the terms
            below.
          </p>

          <h2>Your account</h2>
          <p>
            You&apos;re responsible for the accuracy of the dog and owner information you add,
            and for keeping your login credentials secure. You must have a lawful basis for
            messaging the owners you add — typically that they&apos;re your existing clients.
          </p>

          <h2>Plans and billing</h2>
          <p>
            The Free plan is limited to 10 dogs. Starter and Pro are billed monthly and can be
            cancelled at any time from the dashboard; cancelling stops future billing but does
            not refund the current billing period. Prices are listed on the{" "}
            <a href="/pricing">pricing page</a> and shown in USD.
          </p>

          <h2>Acceptable use</h2>
          <ul>
            <li>Don&apos;t use PawDue to send messages to people who haven&apos;t agreed to hear from your business.</li>
            <li>Don&apos;t use the service for spam, harassment, or any unlawful messaging.</li>
            <li>Don&apos;t attempt to disrupt, reverse-engineer, or overload the service.</li>
          </ul>

          <h2>Message delivery</h2>
          <p>
            PawDue sends reminders through third-party channels (WhatsApp, SMS, email) and does
            its best to ensure timely delivery, including automatic fallback between channels.
            We can&apos;t guarantee delivery in every case, since it ultimately depends on those
            networks and the recipient&apos;s device.
          </p>

          <h2>Availability</h2>
          <p>
            We aim to keep PawDue running reliably but the service is provided as-is, without
            guarantee of uninterrupted availability.
          </p>

          <h2>Changes to these terms</h2>
          <p>
            We may update these terms as the product evolves. Material changes will be
            reflected here with an updated date at the top of the page.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about these terms can be sent to{" "}
            <a href="mailto:hello@pawdue.pet">hello@pawdue.pet</a>.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
