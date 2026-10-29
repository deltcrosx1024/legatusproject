const sections = [
  {
    title: "1. ACCEPTANCE OF TERMS",
    paragraphs: [
      "By accessing or using this service, you agree to be bound by these Terms and Conditions.",
      "This page is a blank template and should be reviewed and updated before public release.",
    ],
  },
  {
    title: "2. SERVICE DESCRIPTION",
    paragraphs: [
      "This application provides an API bridge for receiving and forwarding callback payloads to configured downstream endpoints.",
      "The service is intended for operational and integration use and may be hosted in a cloud environment or server runtime.",
    ],
  },
  {
    title: "3. USER RESPONSIBILITIES",
    paragraphs: [
      "Users are responsible for ensuring that any data sent to this service complies with applicable laws, policies, and contractual obligations.",
      "You are responsible for maintaining the security, validity, and destination of any payloads you transmit through the service.",
    ],
  },
  {
    title: "4. LIMITATION OF LIABILITY",
    paragraphs: [
      "The service is provided on an as-is basis without warranties of any kind, express or implied.",
      "We do not guarantee uninterrupted availability, accuracy of forwarding, or completeness of any data processed by the service.",
    ],
  },
  {
    title: "5. MODIFICATIONS",
    paragraphs: [
      "This service may be updated, modified, or discontinued at any time without prior notice.",
      "Continued use of the service after changes are made constitutes acceptance of the revised terms.",
    ],
  },
  {
    title: "6. GOVERNING LAW",
    paragraphs: [
      "These Terms and Conditions are governed by the laws of the jurisdiction applicable to the service owner.",
      "Any disputes should be resolved through the appropriate legal channels and processes defined by the governing authority.",
    ],
  },
  {
    title: "7. CONTACT",
    paragraphs: [
      "For any questions about these Terms and Conditions, contact the service owner or designated administrator.",
      "Add your official contact details and internal review process before publication.",
    ],
  },
];

export default function TermsPage() {
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
              TERMS & CONDITIONS
            </h1>
            <p className="text-[11px] tracking-[0.12em] text-[#d4d4d4]">
              LAST UPDATED: [DATE]
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href="/i/terms"
              className="rounded-[4px] border border-[#f1f2ff] bg-[#f1f2ff] px-3 py-1 text-[10px] tracking-[0.15em] text-[#000000]"
            >
              TERMS
            </a>
            <a
              href="/i/privacy"
              className="rounded-[4px] border border-[#353535] bg-[#1e1e1e] px-3 py-1 text-[10px] tracking-[0.15em] text-[#d4d4d4] transition-colors hover:border-[#515151]"
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
