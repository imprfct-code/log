function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-foreground-bright">{title}</h2>
      <div className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function PrivacyScreen() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-12 sm:py-8">
      <h1 className="mb-2 text-lg font-bold text-foreground-bright">Privacy Policy</h1>
      <p className="mb-10 text-[12px] text-muted-foreground">Effective date: April 12, 2025</p>

      <Section title="1. Who we are">
        <p>
          imprfct Log (&ldquo;Log&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a devlog platform
          that turns your GitHub commits into a public build journal. This policy explains what data
          we collect, why, and what rights you have.
        </p>
      </Section>

      <Section title="2. What we collect">
        <p>We collect only what is necessary to operate the service:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-foreground">Account data</strong> &mdash; username, avatar URL,
            and GitHub username, obtained from your GitHub account via Clerk OAuth.
          </li>
          <li>
            <strong className="text-foreground">Profile data</strong> &mdash; optional bio you
            provide in settings (max 160 characters).
          </li>
          <li>
            <strong className="text-foreground">Commitments &amp; devlog entries</strong> &mdash;
            project titles, linked repository names, git commit metadata (SHA, message, author name,
            commit URL, branch name, timestamp), and text posts you create.
          </li>
          <li>
            <strong className="text-foreground">Interactions</strong> &mdash; comments and boosts
            you leave on other users&rsquo; commitments.
          </li>
          <li>
            <strong className="text-foreground">Uploaded media</strong> &mdash; images and videos
            you attach to posts or comments, stored in Cloudflare R2.
          </li>
          <li>
            <strong className="text-foreground">Activity data</strong> &mdash; streak count, weekly
            activity summary, and last active date, computed from your usage.
          </li>
          <li>
            <strong className="text-foreground">Waitlist email</strong> &mdash; if you signed up for
            early access before launch, we stored the email address you provided.
          </li>
        </ul>
      </Section>

      <Section title="3. How we use your data">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Display your public devlog and profile to other users.</li>
          <li>Sync commits from your GitHub repositories to your devlog entries.</li>
          <li>Calculate and display your activity streaks.</li>
          <li>Register and manage GitHub webhooks on repositories you connect.</li>
          <li>Generate Open Graph preview images when your content is shared.</li>
        </ul>
        <p>
          We do <strong className="text-foreground">not</strong> sell your data, use it for
          advertising, or share it with data brokers.
        </p>
      </Section>

      <Section title="4. Third-party services">
        <p>We rely on the following services to operate Log:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-foreground">Clerk</strong> &mdash; authentication and session
            management.{" "}
            <a
              href="https://clerk.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-foreground"
            >
              Privacy policy
            </a>
          </li>
          <li>
            <strong className="text-foreground">GitHub</strong> &mdash; OAuth login, commit syncing,
            and webhook registration. We request read access to your repositories and
            admin:repo_hook scope if you opt into webhook-based syncing.{" "}
            <a
              href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-foreground"
            >
              Privacy statement
            </a>
          </li>
          <li>
            <strong className="text-foreground">Convex</strong> &mdash; backend database and
            real-time infrastructure.{" "}
            <a
              href="https://www.convex.dev/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-foreground"
            >
              Privacy policy
            </a>
          </li>
          <li>
            <strong className="text-foreground">Cloudflare R2</strong> &mdash; media file storage.{" "}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-foreground"
            >
              Privacy policy
            </a>
          </li>
          <li>
            <strong className="text-foreground">Vercel</strong> &mdash; frontend hosting and Open
            Graph image generation.{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline transition-colors hover:text-foreground"
            >
              Privacy policy
            </a>
          </li>
        </ul>
      </Section>

      <Section title="5. Cookies">
        <p>
          Log uses a single session cookie set by Clerk for authentication. This is an essential
          cookie required for the service to function. We do not use analytics cookies, advertising
          cookies, or tracking pixels.
        </p>
      </Section>

      <Section title="6. Your rights">
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-foreground">Access</strong> your data &mdash; export all your
            data as JSON from Settings.
          </li>
          <li>
            <strong className="text-foreground">Rectify</strong> your data &mdash; edit your profile
            and bio in Settings.
          </li>
          <li>
            <strong className="text-foreground">Delete</strong> your data &mdash; permanently delete
            your account and all associated data from Settings. This removes your user record,
            commitments, devlog entries, comments, boosts, uploaded files, and GitHub webhook
            registrations.
          </li>
          <li>
            <strong className="text-foreground">Port</strong> your data &mdash; download a JSON
            export of all your data from Settings.
          </li>
          <li>
            <strong className="text-foreground">Object</strong> to processing &mdash; contact us
            using the details below.
          </li>
        </ul>
      </Section>

      <Section title="7. California residents (CCPA)">
        <p>If you are a California resident, you have the right to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Know what personal information we collect and how it is used.</li>
          <li>Request deletion of your personal information.</li>
          <li>Not be discriminated against for exercising your privacy rights.</li>
        </ul>
        <p>
          We do <strong className="text-foreground">not</strong> sell personal information. The
          categories of personal information we collect are listed in section 2 above.
        </p>
      </Section>

      <Section title="8. Data retention">
        <p>
          We retain your data for as long as your account is active. When you delete your account,
          all associated data is permanently removed. We do not keep backups of deleted accounts.
        </p>
      </Section>

      <Section title="9. International transfers">
        <p>
          Your data is processed and stored in the United States through our service providers
          (Convex, Clerk, Cloudflare, Vercel). By using Log, you consent to your data being
          transferred to and processed in the United States.
        </p>
      </Section>

      <Section title="10. Children">
        <p>
          Log is not directed at children under the age of 13. We do not knowingly collect personal
          information from children. If you believe a child has provided us with personal data,
          please contact us so we can delete it.
        </p>
      </Section>

      <Section title="11. Changes to this policy">
        <p>
          We may update this policy from time to time. We will notify you of material changes by
          posting the new policy on this page with a revised effective date.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          For privacy questions or to exercise your rights, email us at{" "}
          <a
            href="mailto:privacy@imprfct.dev"
            className="underline transition-colors hover:text-foreground"
          >
            privacy@imprfct.dev
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
