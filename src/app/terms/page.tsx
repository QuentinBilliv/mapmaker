import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - idomap",
};

export default function TermsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to idomap
        </Link>
        <h1 className="text-2xl font-bold mt-6 mb-8">Terms of Service</h1>
        <div className="prose prose-sm dark:prose-invert space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>Last updated: April 18, 2026</p>

          <Section title="1. Acceptance">
            By using idomap (&quot;the Service&quot;), you agree to these Terms of Service. If you do not agree, do not use the Service.
          </Section>

          <Section title="2. Description of the Service">
            idomap is an online map editor that allows users to create, edit, and publish interactive maps. The Service is provided free of charge. Some features may require a paid subscription in the future.
          </Section>

          <Section title="3. Accounts">
            You may need to create an account via third-party authentication (Google, GitHub) to access certain features such as saving and publishing maps. You are responsible for maintaining the security of your account. You must not create accounts using automated means or impersonate others.
          </Section>

          <Section title="4. User content">
            You retain ownership of the maps and content you create on idomap. By publishing a map (making it public or unlisted), you grant idomap a non-exclusive, worldwide, royalty-free license to display and distribute that map as part of the Service (including generating thumbnails, open graph images, and embed previews).
          </Section>

          <Section title="5. Prohibited content">
            You must not publish content that:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Contains sexual, pornographic, or sexually explicit material</li>
              <li>Depicts or promotes child sexual abuse material (CSAM)</li>
              <li>Contains hate speech, incitement to violence, or harassment</li>
              <li>Exposes personal data of third parties without consent</li>
              <li>Infringes on copyrights, trademarks, or other intellectual property rights</li>
              <li>Constitutes spam or is used for advertising without authorization</li>
              <li>Violates any applicable law</li>
            </ul>
          </Section>

          <Section title="6. Moderation and takedown">
            idomap reserves the right to remove, unpublish, or restrict access to any content at any time, without prior notice, if it violates these Terms or applicable law. We may also suspend or terminate accounts that repeatedly violate these Terms.
          </Section>

          <Section title="7. Copyright (DMCA and EU)">
            idomap respects intellectual property rights. If you believe that content on idomap infringes your copyright, you may submit a takedown request to <strong>contact@idomap.com</strong> including: identification of the copyrighted work, the URL of the infringing content, your contact information, and a statement of good faith. We act as a hosting provider under the U.S. Digital Millennium Copyright Act (DMCA), Article 6 of the French LCEN, and Article 14 of the EU e-Commerce Directive, and we process takedown requests expeditiously upon notification.
          </Section>

          <Section title="8. Reporting">
            If you believe that content on idomap violates these Terms or applicable law, you can use the &quot;Report&quot; button on any public map page, or contact us at the email address below.
          </Section>

          <Section title="9. Limitation of liability">
            The Service is provided &quot;as is&quot; without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. To the fullest extent permitted by applicable law, idomap shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of the Service. We do not guarantee the availability, accuracy, or permanence of user-generated content or the Service itself.
          </Section>

          <Section title="10. Changes to these Terms">
            We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms. We will indicate the date of the last update at the top of this page.
          </Section>

          <Section title="11. Contact">
            For any questions regarding these Terms, reports of illegal content, or copyright takedown requests, please contact us at: <strong>contact@idomap.com</strong>
          </Section>

          <Section title="12. Governing law">
            If you are located in the European Union, these Terms are governed by the laws of France and you may bring claims before the competent courts of France. If you are located in the United States, these Terms are governed by the laws of the State of California, without regard to conflict-of-law principles, and any disputes shall be resolved in the state or federal courts located in San Francisco County, California. For all other jurisdictions, these Terms are governed by the laws of France.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-2">{title}</h2>
      <div>{children}</div>
    </div>
  );
}
