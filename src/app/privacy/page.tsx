import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - idomap",
};

export default function PrivacyPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to idomap
        </Link>
        <h1 className="text-2xl font-bold mt-6 mb-8">Privacy Policy</h1>
        <div className="prose prose-sm dark:prose-invert space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>Last updated: April 18, 2026</p>

          <Section title="1. Data controller">
            idomap is operated by Quentin Roudier, based in France. For any questions regarding your personal data, you can contact us at: <strong>contact@idomap.com</strong>
          </Section>

          <Section title="2. Data we collect">
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account information</strong>: when you sign in via Google or GitHub, we receive and store your name, email address, and profile picture as provided by the authentication provider.</li>
              <li><strong>Map data</strong>: the maps you create, including features, metadata, and associated files.</li>
              <li><strong>Technical data</strong>: IP address, browser type, and access timestamps in server logs, collected automatically when you use the Service.</li>
            </ul>
          </Section>

          <Section title="3. Why we collect it">
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account information</strong>: to authenticate you, associate maps with your account, and display your name on public maps you publish.</li>
              <li><strong>Map data</strong>: to provide the core functionality of the Service (saving, editing, publishing maps).</li>
              <li><strong>Technical data</strong>: for security, abuse prevention, and debugging purposes.</li>
            </ul>
            <p className="mt-2">Legal basis (GDPR Article 6): legitimate interest for the operation of the Service and performance of the contract you accept by using idomap.</p>
          </Section>

          <Section title="4. Data sharing">
            We do not sell, rent, or share your personal data with third parties for marketing purposes. Your data may be processed by:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Convex</strong> (database and backend hosting)</li>
              <li><strong>Vercel</strong> (web hosting)</li>
              <li><strong>Google / GitHub</strong> (authentication providers)</li>
            </ul>
            <p className="mt-2">These providers act as data processors and have their own privacy policies. We may also disclose data if required by law or a court order.</p>
          </Section>

          <Section title="5. Data retention">
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account data</strong>: retained as long as your account exists.</li>
              <li><strong>Map data</strong>: retained as long as the map exists in your account. Deleted maps are permanently removed.</li>
              <li><strong>Server logs</strong>: retained for up to 12 months.</li>
            </ul>
          </Section>

          <Section title="6. Your rights (GDPR)">
            Under the General Data Protection Regulation (GDPR), you have the right to:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Access</strong> your personal data</li>
              <li><strong>Rectify</strong> inaccurate data</li>
              <li><strong>Delete</strong> your account and associated data</li>
              <li><strong>Export</strong> your data (you can export your maps in .idomap format at any time)</li>
              <li><strong>Object</strong> to processing based on legitimate interest</li>
              <li><strong>Lodge a complaint</strong> with the CNIL (Commission Nationale de l&apos;Informatique et des Libertes), the French data protection authority</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at <strong>contact@idomap.com</strong>. We will respond within 30 days.</p>
          </Section>

          <Section title="7. Cookies">
            idomap uses only essential cookies required for authentication and session management. We do not use tracking cookies, advertising cookies, or analytics cookies. No cookie consent banner is required as we only use strictly necessary cookies.
          </Section>

          <Section title="8. Children">
            idomap is not directed at children under 16. We do not knowingly collect personal data from children under 16. If you believe we have collected data from a child, please contact us and we will delete it promptly.
          </Section>

          <Section title="9. Changes to this policy">
            We may update this Privacy Policy from time to time. The date of the last update is indicated at the top of this page. Continued use of the Service after changes constitutes acceptance.
          </Section>

          <Section title="10. Contact">
            For any questions about this Privacy Policy or to exercise your rights, contact us at: <strong>contact@idomap.com</strong>
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
