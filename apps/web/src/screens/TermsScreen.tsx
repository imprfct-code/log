function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-foreground-bright">{title}</h2>
      <div className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function TermsScreen() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-12 sm:py-8">
      <h1 className="mb-2 text-lg font-bold text-foreground-bright">Terms of Service</h1>
      <p className="mb-10 text-[12px] text-muted-foreground">Effective date: April 12, 2025</p>

      <Section title="1. Acceptance">
        <p>
          By accessing or using imprfct Log (&ldquo;Log&rdquo;, &ldquo;the Service&rdquo;), you
          agree to these Terms of Service. If you do not agree, do not use the Service.
        </p>
      </Section>

      <Section title="2. Description of service">
        <p>
          Log is a devlog platform that lets you publicly commit to building something,
          automatically tracks your GitHub commits, and displays your progress as a public devlog.
          The Service is provided by imprfct (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
        </p>
      </Section>

      <Section title="3. Accounts">
        <p>
          You sign in using your GitHub account via Clerk OAuth. You are responsible for maintaining
          the security of your GitHub account. One person may not maintain more than one account.
          You must be at least 13 years old to use the Service.
        </p>
      </Section>

      <Section title="4. User content">
        <p>
          You retain ownership of all content you create on Log, including commitments, posts,
          comments, and uploaded media. By posting content, you grant us a worldwide, non-exclusive,
          royalty-free license to display, distribute, and promote your content as part of the
          Service.
        </p>
        <p>
          You are solely responsible for the content you post. You agree not to post content that is
          unlawful, abusive, defamatory, or infringes on the rights of others.
        </p>
      </Section>

      <Section title="5. GitHub integration">
        <p>
          When you connect a GitHub repository, you authorize Log to access commit metadata (SHA,
          message, author, timestamp, branch) from that repository. If you enable webhook syncing,
          you additionally grant Log permission to register push event webhooks on the repository.
        </p>
        <p>
          We never read your source code, modify your repository settings, or push commits on your
          behalf.
        </p>
      </Section>

      <Section title="6. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Use the Service for any unlawful purpose.</li>
          <li>Scrape, crawl, or use automated means to access the Service without permission.</li>
          <li>Interfere with or disrupt the Service or its infrastructure.</li>
          <li>Impersonate another person or entity.</li>
          <li>Upload malicious code or content designed to harm other users.</li>
        </ul>
      </Section>

      <Section title="7. Termination">
        <p>
          You may delete your account at any time from Settings. Account deletion permanently
          removes all your data, including commitments, devlog entries, comments, boosts, uploaded
          files, and GitHub webhook registrations.
        </p>
        <p>
          We may suspend or terminate your account if you violate these Terms. We will make
          reasonable efforts to notify you before doing so, except in cases of egregious violations.
        </p>
      </Section>

      <Section title="8. Disclaimers">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
          warranties of any kind, either express or implied. We do not guarantee that the Service
          will be uninterrupted, error-free, or secure.
        </p>
      </Section>

      <Section title="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, imprfct shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising from your use of the
          Service. Our total liability for any claim is limited to the amount you paid us in the 12
          months preceding the claim, if any.
        </p>
      </Section>

      <Section title="10. Governing law">
        <p>
          These Terms are governed by the laws of the State of California, United States, without
          regard to conflict of law principles.
        </p>
      </Section>

      <Section title="11. Changes to these terms">
        <p>
          We may update these Terms from time to time. We will notify you of material changes by
          posting the revised Terms with a new effective date. Continued use of the Service after
          changes constitutes acceptance.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          For questions about these Terms, email us at{" "}
          <a
            href="mailto:hello@imprfct.dev"
            className="underline transition-colors hover:text-foreground"
          >
            hello@imprfct.dev
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
