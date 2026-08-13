import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Silicon Forecast about methodology, affiliate compliance, retail partnerships or privacy.",
};

const routes = [
  ["Data or methodology", "Corrections, product-identity concerns and methodology questions."],
  ["Affiliate compliance", "Publisher-profile, promotional-method and disclosure enquiries."],
  ["Retail and commercial", "Authorised data feeds, retailer participation and partnerships."],
  ["Privacy", "Personal-data questions, access or deletion requests."],
] as const;

export default function Page() {
  return (
    <div className="shell page-shell">
      <header className="page-header">
        <p className="eyebrow">Contact</p>
        <h1>Questions, corrections and partnership enquiries.</h1>
        <p>
          Silicon Forecast is in active development. Use the route below for project, compliance, retailer or privacy
          enquiries.
        </p>
      </header>

      <section className="contact-panel">
        <div>
          <p className="eyebrow">Email</p>
          <a className="contact-email" href={`mailto:${site.contactEmail}`}>
            {site.contactEmail}
          </a>
          <p>
            This is the active project address for methodology, compliance, retailer, privacy and publisher-network
            enquiries.
          </p>
        </div>
        <div className="contact-routes">
          {routes.map(([heading, body]) => (
            <article key={heading}>
              <strong>{heading}</strong>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="notice">
        <strong>Publisher and retailer enquiries</strong>
        <span>
          Affiliate-network applications and commercial discussions do not imply approval, endorsement or an active
          partnership. Current relationships will be disclosed when they actually exist.
        </span>
      </div>

      <p className="privacy-nudge">
        Please do not send passwords, API keys, payment information or unnecessary personal data. See{" "}
        <Link href="/privacy">Privacy &amp; cookies</Link>.
      </p>
    </div>
  );
}
