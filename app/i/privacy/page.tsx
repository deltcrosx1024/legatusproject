const sections = [
  {
    title: "1. INTRODUCTION",
    paragraphs: [
      "This Privacy Policy explains how data is collected, used, stored, and protected when you interact with this service.",
      "This page is a blank template and should be reviewed and customized before production use.",
    ],
  },
  {
    title: "2. INFORMATION WE MAY COLLECT",
    paragraphs: [
      "We may collect information related to requests, device metadata, IP addresses, timestamps, and request payloads required to operate the service.",
      "This includes log information necessary for monitoring performance, debugging requests, and maintaining service integrity.",
    ],
  },
  {
    title: "3. HOW INFORMATION IS USED",
    paragraphs: [
      "Information may be used to process incoming callbacks, maintain service reliability, detect abuse or operational issues, and improve monitoring workflows.",
      "The service may also use basic operational data for uptime, debugging, and performance tracking.",
    ],
  },
  {
    title: "4. STORAGE & RETENTION",
    paragraphs: [
      "Stored data is retained only for as long as needed to operate the service, investigate issues, or satisfy legal or operational requirements.",
      "Retention periods should be defined in accordance with your own compliance and business policies.",
    ],
  },
  {
    title: "5. THIRD-PARTY PROCESSORS",
    paragraphs: [
      "This service may forward data to third-party providers or downstream systems as part of the callback relay workflow.",
      "Any such providers should be disclosed and governed by contractual safeguards appropriate to the data being processed.",
    ],
  },
  {
    title: "6. SECURITY",
    paragraphs: [
      "Reasonable administrative, technical, and organizational safeguards should be applied to protect user data and operational information.",
      "This template does not replace your own security review, access control model, or incident response policy.",
    ],
  },
  {
    title: "7. CONTACT",
    paragraphs: [
      "For privacy-related questions, contact the service owner or designated administrator responsible for the application.",
      "Add your actual contact details and internal escalation process before publishing this page publicly.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main
      className="min-h-screen bg-[#000000] text-[#f1f2ff] antialiased uppercase"
      style={{ fontFamily: "var(--font-novecento-bld), sans-serif" }}
    >
      <div className="mx-auto flex max-w-5xl flex-col px-6 py-16 sm:px-8 lg:px-12">
        <div className="rounded-[6px] border border-[#353535] bg-[#1e1e1e] p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.8)] sm:p-10">
          <div className="flex flex-col gap-4 border-b border-[#353535] pb-6">
            <p className="text-[10px] tracking-[0.32em] text-[#d4d4d4]">LEGAL</p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#f1f2ff] sm:text-4xl">
              PRIVACY POLICY
            </h1>
            <p className="text-[11px] tracking-[0.12em] text-[#d4d4d4]">
              LAST UPDATED: [DATE]
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href="/i/terms"
              className="rounded-[4px] border border-[#353535] bg-[#1e1e1e] px-3 py-1 text-[10px] tracking-[0.15em] text-[#d4d4d4] transition-colors hover:border-[#515151]"
            >
              TERMS
            </a>
            <a
              href="/i/privacy"
              className="rounded-[4px] border border-[#f1f2ff] bg-[#f1f2ff] px-3 py-1 text-[10px] tracking-[0.15em] text-[#000000]"
            >
              PRIVACY
            </a>
          </div>

          <div className="mt-8 space-y-4">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-[4px] border border-[#353535] bg-[#000000]/20 p-5"
              >
                <h2 className="text-[10px] tracking-[0.18em] text-[#d4d4d4]">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-6 text-[#f1f2ff]/90">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
