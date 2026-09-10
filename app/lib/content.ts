export const site = {
  name: "AIBN Chartered Accountants Ltd",
  // Canonical host. `www` is canonical: the apex 308-redirects to it in Vercel,
  // so this must carry the www prefix or every canonical URL and sitemap entry
  // points at a redirect. Drives metadataBase, sitemap.xml and robots.txt.
  url: "https://www.aibncharteredaccountants.ie",
  // Live Zoho mailbox (the domain's MX points at Zoho). Also the address the
  // site sends admin replies FROM: see SMTP_USER / MAIL_FROM in the env.
  email: "info@aibncharteredaccountants.ie",
  phone: "+353 (0)1 234 5678",
  phoneHref: "tel:+35312345678",
  address: ["The Chase, Carmanhall Road", "Sandyford, Dublin 18, D18 Y3X2"],
  hours: "Mon–Fri, 9:00–17:30",
};

export const industries = [
  {
    name: "Startups & SaaS",
    note: "R&D credits, KEEP options and investor-ready reporting.",
  },
  {
    name: "Hospitality",
    note: "Cafés, restaurants and hotels: tips, margins and seasonal cash flow.",
  },
  {
    name: "Retail",
    note: "Bricks-and-mortar and online sellers: stock, VAT and multi-channel margins.",
  },
  {
    name: "Healthcare",
    note: "GPs, consultants and clinics: practice income, pensions and locum structuring.",
  },
  {
    name: "Professional services",
    note: "Agencies and consultancies: WIP, utilisation and partner profit shares.",
  },
];

export interface PricingTier {
  name: string;
  monthly: number;
  annualMonthly: number;
  blurb: string;
  features: string[];
  popular?: boolean;
}

export const pricingTiers: PricingTier[] = [
  {
    name: "Sole Trader",
    monthly: 59,
    annualMonthly: 49,
    blurb: "For the self-employed who want filings handled and a number to call.",
    features: [
      "Income tax return (Form 11)",
      "Quarterly bookkeeping review",
      "Revenue registration and correspondence",
      "Deadline tracking and reminders",
      "Email and phone support",
    ],
  },
  {
    name: "Limited Company",
    monthly: 169,
    annualMonthly: 139,
    blurb: "The complete compliance package for trading limited companies.",
    popular: true,
    features: [
      "Year-end accounts and CT1",
      "Director income tax return included",
      "VAT returns",
      "Payroll for up to 5 employees",
      "Quarterly management accounts",
      "Dedicated accountant",
    ],
  },
  {
    name: "Growth & CFO",
    monthly: 429,
    annualMonthly: 359,
    blurb: "A finance function without the headcount, for businesses scaling up.",
    features: [
      "Everything in Limited Company",
      "Monthly management accounts",
      "Cash-flow forecasting",
      "Quarterly virtual-CFO session",
      "Unlimited payroll",
      "R&D tax credit claims included",
    ],
  },
];

export const pricingAddons = [
  { name: "Statutory audit", note: "Scoped and quoted separately" },
  { name: "Books cleanup / catch-up", note: "One-off, quoted after review" },
  { name: "Company formation", note: "€150 one-off" },
  { name: "R&D credit claim", note: "Included on Growth, else from €750" },
];

export const team = [
  { name: "Niaz Morshed", role: "Managing Partner", credential: "FCA" },
  { name: "Sarah Whitfield", role: "Audit Partner", credential: "ACA" },
  { name: "Tom Adeyemi", role: "Tax Director", credential: "CTA" },
  { name: "Emily Carter", role: "Practice Manager", credential: "ATI" },
];

export const values = [
  {
    title: "Plain English, always",
    description:
      "If you need a glossary to read your accounts, we have failed. Every report we send is written to be understood on first read.",
  },
  {
    title: "Proactive beats reactive",
    description:
      "Tax planning in October is too late. We work ahead of deadlines and bring you ideas before you ask.",
  },
  {
    title: "A short client list, on purpose",
    description:
      "Each partner caps their client list. You get someone who knows your business, not whoever picks up the phone.",
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   Service taxonomy (Ireland)
   Figures current for 2026 (Budget 2026 basis), Republic of Ireland. Verify at point of advice.
   Two levels: ServiceCategory → SubService.
   `kind` controls how a category renders:
     - "services"  → landing page lists sub-services, each with a detail page
     - "personas"  → landing lists audience segments, each with a detail page
     - "single"    → category IS the detail page (no children); uses included/bestFor
   `status: "coming-soon"` renders a placeholder and is excluded from detail routes.
   ────────────────────────────────────────────────────────────────────────── */

export type CategoryKind = "services" | "personas" | "single";
export type Availability = "available" | "coming-soon";

export interface SubService {
  slug: string;
  title: string;
  blurb: string;
  overview: string;
  included: string[];
  bestFor: string[];
  /** Long-form detail: 2+ paragraphs (split on blank line). Rendered below the scope list. */
  context?: string;
}

export interface ServiceCategory {
  slug: string;
  title: string;
  blurb: string;
  overview: string;
  kind: CategoryKind;
  status?: Availability;
  /** Sub-services or personas. Empty for `kind: "single"`. */
  items: SubService[];
  /** Used only when `kind: "single"`. */
  included?: string[];
  bestFor?: string[];
  /** Long-form detail for single-kind categories. */
  context?: string;
}

export const serviceCategories: ServiceCategory[] = [
  {
    slug: "account-bookkeeping",
    title: "Accounting and Bookkeeping",
    blurb:
      "Books that are never behind, VAT and payroll that just run, accounts filed early. The compliance work, off your desk.",
    overview:
      "The compliance backbone of your business, run properly. From live bookkeeping to year-end accounts and tax filings, we keep you current and on the right side of Revenue, with numbers you can actually use to make decisions.",
    kind: "services",
    items: [
      {
        slug: "taxation",
        title: "Taxation",
        blurb:
          "Corporation tax, VAT, income tax and reliefs: planned ahead, filed on time, never more than you owe.",
        overview:
          "Corporation tax in Ireland runs at 12.5% on trading income and 25% on everything else, and the gap between those two rates is where most of the planning happens. We run the full cycle: the CT1 filed through Revenue’s ROS, R&D and capital-allowance claims, and the director’s own Form 11 handled alongside the company. If you’re a group turning over more than €750m, the 15% minimum top-up under Pillar Two comes into play; we tell you early if that’s you. Whatever position we take, you get it in writing.",
        included: [
          "Corporation tax returns: the CT1, prepared and filed through ROS",
          "Trading vs passive income: split correctly, close-company surcharge kept in check",
          "R&D tax credit: 35% back on qualifying spend, claimed and documented (Budget 2026)",
          "Capital allowances: reviewed for accelerated reliefs you might be missing",
          "Director’s income tax: the personal Form 11, filed with the company accounts",
          "Revenue audits: interventions and correspondence handled on your behalf",
        ],
        bestFor: [
          "Owner-managed companies trading in Ireland",
          "Businesses with R&D spend, capital investment or innovation grants",
          "Groups large enough to face Pillar Two",
        ],
        context:
          "The corporation tax return, the CT1, is due nine months after your accounting year-end, on or before the 23rd of that month, and it’s filed through Revenue’s ROS. Miss the date and you face a surcharge on top of the tax, plus restrictions on using losses and reliefs, so we work to a timetable that has the return ready well before the deadline rather than on it.\n\nTwo things move real money here. The R&D tax credit is now worth 35% of qualifying spend, and Budget 2026 raised the first-year cash refund threshold to €87,500, worth knowing if you’re investing in genuine development work. And the gap between the 12.5% trading rate and the 25% rate on passive income means how profits are classified, and how a close company distributes them, changes the bill. We plan both rather than leaving them to the year-end scramble.",
      },
      {
        slug: "vat-returns",
        title: "VAT Returns",
        blurb:
          "Accurate VAT registration and returns: filed through ROS and reconciled to your books before they go in.",
        overview:
          "VAT is where small mistakes get expensive fast. Ireland registers at €85,000 for goods and €42,500 for services, files bi-monthly through ROS, and adds an annual Return of Trading Details. We handle registration, scheme selection and every return, and reconcile each one to your books before it goes in.",
        included: [
          "VAT registration: €85k goods, €42.5k services thresholds handled",
          "VAT3 returns: filed bi-monthly through ROS",
          "Trading details: the annual Return of Trading Details (RTD)",
          "EU trade: VIES and Intrastat for cross-border sales",
          "Scheme advice: cash accounting, margin, OSS/IOSS",
          "Reconciliation: every return matched to your ledger before it goes in",
        ],
        bestFor: [
          "Businesses trading across Ireland and the EU",
          "E-commerce and cross-border sellers",
          "Anyone near or over the registration threshold",
        ],
        context:
          "You have to register for VAT once turnover passes €85,000 for goods or €42,500 for services in any twelve-month period, and you can register voluntarily below that where it pays to reclaim VAT on what you buy. From there most businesses file a VAT3 every two months through ROS, plus an annual Return of Trading Details that reconciles the year. Selling across the EU brings in VIES returns, and distance sellers cross into the OSS/IOSS regime once past €10,000.\n\nRates matter as much as thresholds. From 1 July 2026 the VAT rate on food, catering and hairdressing dropped to 9% from 13.5%, the sort of change that quietly affects both your pricing and your returns. We keep the treatment right and reconcile every return to your ledger before it’s submitted, because VAT mistakes are the ones Revenue tends to spot fastest.",
      },
      {
        slug: "annual-accounts",
        title: "Annual Accounts",
        blurb:
          "Year-end statutory accounts under FRS 102 / FRS 105, filed with the CRO: done early, not at the deadline.",
        overview:
          "Year-end accounts should tell you something, not just satisfy a filing. We prepare statutory accounts under FRS 102 (or FRS 105 for micro-entities), agree them with you in plain English, and file on time. Irish accounts go to the CRO with the annual return (Form B1), tagged in iXBRL for Revenue. Many small companies (turnover up to €15m, balance sheet up to €7.5m, up to 50 employees) qualify for audit exemption.",
        included: [
          "Statutory accounts: prepared under FRS 102 or FRS 105",
          "CRO filing: accounts and the Form B1 annual return",
          "iXBRL tagging: for Revenue and CRO requirements",
          "Directors’ report: prepared alongside the annual return",
          "Tax computation: corporation tax prepared with the accounts",
          "Exemption check: small-company and audit-exemption assessment",
        ],
        bestFor: [
          "Limited companies in Ireland",
          "Directors who file late every year",
          "Groups with multiple entities",
        ],
        context:
          "Every Irish company files an annual return (Form B1) with the CRO, with financial statements attached, within 56 days of its Annual Return Date. Miss that and a €100 late fee applies straight away, then €3 a day up to a maximum of €1,200, and, more expensively, the company can lose its audit exemption. We file early to keep both the penalty and the exemption off the table.\n\nThe accounts themselves are prepared under FRS 102, or FRS 105 for micro-entities, and tagged in iXBRL for Revenue. Most small companies (turnover up to €15m, balance sheet up to €7.5m, and up to 50 employees) qualify for audit exemption, which keeps the cost down. We prepare the accounts so they actually tell you something, agree them with you in plain English, and file them alongside the corporation tax computation.",
      },
      {
        slug: "bookkeeping",
        title: "Bookkeeping and Cloud Accounting",
        blurb:
          "Clean, current books on Xero or QuickBooks, with monthly management accounts you can actually read.",
        overview:
          "Books that are three months behind are books you cannot run a business on. We keep yours current on Xero or QuickBooks (bank feeds live, receipts captured, queries chased) and close each month with accounts in plain English, ready for whatever Revenue asks.",
        included: [
          "Bookkeeping: full ledger on Xero or QuickBooks",
          "Reconciliation: bank feeds, receipt capture and matching",
          "Monthly close: with management accounts you can read",
          "Digital records: real-time and ready for ROS filing",
          "Reporting: debtors, creditors and who owes what",
          "Migration: off spreadsheets or legacy software, team trained",
        ],
        bestFor: [
          "Founders doing their own books at midnight",
          "Sole traders and landlords filing with Revenue",
          "Businesses that want monthly numbers, not annual",
        ],
        context:
          "Revenue’s shift towards real-time and digital reporting is quietly ending the shoebox-of-receipts approach. Records kept live on Xero or QuickBooks aren’t just tidier; they’re increasingly what ROS filing, VAT returns and any Revenue query assume you already have to hand.\n\nWe keep the bank feeds flowing, chase the receipts and reconcile as we go, then close each month with management accounts written in plain English. The point isn’t neat books for their own sake; it’s that you can see margin, cash and who owes you money in the month it matters, rather than finding out nine months later in a set of statutory accounts.",
      },
      {
        slug: "payroll",
        title: "Payroll and Pensions",
        blurb:
          "Accurate payslips, real-time submissions and pension auto-enrolment handled: your team paid right, every cycle.",
        overview:
          "Payroll is unforgiving: one late submission or a missed pension upload and you are writing to Revenue. We run the whole cycle: payslips, PAYE Modernisation submissions, pensions and year-end forms. We also keep you ahead of the cost changes that keep coming: the scheduled PRSI increases and My Future Fund pension auto-enrolment, live since January 2026.",
        included: [
          "Payroll runs: weekly or monthly, on schedule",
          "PAYE Modernisation: real-time submissions to Revenue",
          "Deductions: PRSI, USC and PAYE calculated and filed",
          "Auto-enrolment: My Future Fund readiness",
          "Benefits: benefit-in-kind and expense reporting",
          "Year-end: payroll returns posted to your books",
        ],
        bestFor: [
          "Companies hiring their first employees",
          "Teams of 1 to 100 on the payroll",
          "Directors balancing salary and dividends",
        ],
        context:
          "Payroll in Ireland runs on PAYE Modernisation: every pay run is reported to Revenue in real time, before your employees are paid, through ROS. A late or wrong submission shows up immediately, which is what makes payroll unforgiving in a way annual filings aren’t. We run the full cycle: payslips, PRSI, USC, PAYE and the year-end returns, so nothing slips through.\n\nTwo cost changes are live right now. Employee PRSI sits at 4.2% and rises again to 4.35% from 1 October 2026, part of a run of scheduled increases. And pension auto-enrolment (My Future Fund) started on 1 January 2026: employees aged 23 to 60 earning over €20,000, who aren’t already in a scheme, are enrolled automatically, with employer and employee each contributing 1.5% of gross pay to begin with. We handle the enrolment and the contributions as part of the regular payroll run, not as a separate project.",
      },
      {
        slug: "audit-assurance",
        title: "Audit and Assurance",
        blurb:
          "Statutory and voluntary audits that stand up to scrutiny, and give lenders, boards and buyers confidence in your numbers.",
        overview:
          "An audit should do more than satisfy a legal requirement. The first question we answer is whether you even need one: many companies qualify for audit exemption (turnover up to €15m, balance sheet up to €7.5m, up to 50 employees). Since 16 July 2025, a single late annual return no longer costs a small or micro company that exemption; it is lost only on a second late filing within five years. When you do need an audit, ours are planned around your risks, run under ISA (Ireland) with minimal disruption, and end with a management letter you will actually act on.",
        included: [
          "Statutory audits: conducted under ISA (Ireland)",
          "Exemption check: audit-exemption and group-size assessment",
          "Voluntary audits: for lenders, boards or investors",
          "Internal audit: controls reviewed and tested",
          "Grant and charity: SORP audits handled",
          "Due diligence: support on acquisitions",
        ],
        bestFor: [
          "Companies above the audit-exemption threshold",
          "Companies that lost exemption through repeated late filings",
          "Businesses raising debt or equity",
        ],
        context:
          "The first question about an audit is whether you need one at all. A company stays audit-exempt provided it meets two of three limits (turnover up to €15m, balance sheet up to €7.5m, and up to 50 employees) and files on time. Since 16 July 2025, a single late annual return no longer costs a small or micro company its exemption; that is now lost only on a second late filing within five years, a real second chance where none existed before.\n\nAn audit becomes necessary once a company is over those limits, has lost the exemption, or a lender, investor or grant body requires one. We plan it around where the risk actually sits, run it under ISA (Ireland), and finish with a management letter you can act on. A statutory audit under the Companies Act 2014 is the baseline; a voluntary one is often what gets a deal or a facility over the line.",
      },
    ],
  },
  {
    slug: "business-consulting",
    title: "Business Consulting",
    blurb:
      "Forming a company, raising finance, moving into a new market: the big calls, made with the numbers in front of you.",
    overview:
      "Practical advice from people who know your numbers. Whether you are forming a company, raising finance or expanding into a new market, we help you make the call with the figures in front of you.",
    kind: "services",
    items: [
      {
        slug: "company-setup",
        title: "Company Setup and Secretarial",
        blurb:
          "Incorporation, registrations and statutory filings to get you trading fast and keep the CRO happy.",
        overview:
          "Starting a company involves a dozen small registrations that are easy to get wrong and tedious to fix. We incorporate at the CRO, register you for the right taxes with Revenue, and keep the statutory book maintained, including the annual return (Form B1), which falls due six months after incorporation and every year after.",
        included: [
          "Company incorporation: registered at the CRO and ready to trade",
          "Tax registration: PAYE, VAT and corporation tax set up with Revenue",
          "Annual returns: the Form B1 and statutory filings kept current",
          "Statutory registers: maintained, including beneficial ownership (RBO)",
          "Shares and office: issues, transfers and a registered office service",
          "Board paperwork: dividend documentation and minutes drawn up",
        ],
        bestFor: [
          "First-time founders",
          "Sole traders incorporating",
          "Groups adding subsidiaries",
        ],
        context:
          "A new Irish company is incorporated at the CRO, usually as a private company limited by shares (LTD), and needs at least one EEA-resident director, or a Section 137 insurance bond if every director is non-resident. Straight after incorporation come the registrations that are easy to overlook: corporation tax, and PAYE or VAT where they apply, plus the Register of Beneficial Ownership (RBO), which has to be filed within five months.\n\nThe filing that catches people out is the first annual return (Form B1), due six months after incorporation (no financial statements are needed that first time), but miss it and the clock starts on penalties and audit-exemption risk. We handle the incorporation, the registrations and the statutory registers, and get you trading quickly with both the CRO and Revenue satisfied from day one.",
      },
      {
        slug: "financial-consulting",
        title: "Financial Consulting",
        blurb:
          "Funding strategy, financial modelling and decision support: a finance brain on call when the stakes are high.",
        overview:
          "When the numbers behind a decision run to six or seven figures, a gut call isn’t enough. We build the model, pressure-test the assumptions and sit with you while you decide: funding rounds, pricing, major hires, acquisitions.",
        included: [
          "Financial modelling: scenarios built and stress-tested",
          "Funding support: loan and grant applications put together",
          "Pricing analysis: margins and price points pulled apart",
          "Investment appraisal: business cases costed before you commit",
          "Cash-flow strategy: the runway mapped, not guessed",
          "Board reporting: packs your investors and directors trust",
        ],
        bestFor: [
          "Founders facing a big financial decision",
          "Businesses raising debt or equity",
          "Teams without an in-house finance lead",
        ],
        context:
          "Big financial decisions tend to arrive with a deadline and imperfect information: a funding round closing, a lease to commit to, a hire you can’t easily undo. The value of a model isn’t precision to the last euro; it’s seeing how the decision behaves when your assumptions turn out wrong, so you know where the real risk is before you sign.\n\nWe build the numbers around your actual accounts rather than a template (cash runway, pricing and margin, the funding gap and how it gets filled), and stay in the room while you weigh it up. If you’re applying for finance, banks and State-backed funders want to see that the projections hold together and the assumptions are defensible; we make sure they are.",
      },
      {
        slug: "international-expansion",
        title: "International Expansion",
        blurb:
          "Cross-border setup and tax structuring for businesses moving from Ireland into the EU and beyond.",
        overview:
          "Expanding into a new country multiplies your obligations. Whether you are moving into the EU single market or further afield, there are VAT registration, permanent-establishment and transfer-pricing questions to answer first. Large groups also need to watch the 15% global minimum tax (Pillar Two). We work through those questions with you before you commit, then handle the structure and its ongoing compliance.",
        included: [
          "Cross-border structuring: the setup planned from Ireland out",
          "Entity setup: companies established in new jurisdictions",
          "PE and transfer pricing: permanent-establishment and pricing risk reviewed",
          "EU VAT: OSS/IOSS registration and customs guidance",
          "Treaty planning: withholding tax and double-tax relief",
          "Pillar Two: the 15% global minimum tax assessed for large groups",
        ],
        bestFor: [
          "Irish firms expanding into the EU",
          "Overseas businesses setting up in Ireland",
          "Groups rationalising their structure",
        ],
        context:
          "Trading into another country rarely means one new obligation; it usually means several at once. Selling goods or services across the EU can trigger a VAT registration abroad or bring you into the OSS/IOSS regime, and putting people or a fixed place of business on the ground can create a permanent establishment that’s taxable there. Get the structure wrong early and it’s slow and costly to unwind.\n\nFor larger groups there’s Pillar Two on top: a 15% global minimum effective tax rate for groups with consolidated turnover above €750m, now in force across the EU. Ireland keeps its 12.5% headline rate, but big groups pay a top-up to reach 15%. We map the VAT, permanent-establishment, transfer-pricing and treaty questions before you move, then set the structure up and keep it compliant.",
      },
      {
        slug: "business-planning",
        title: "Business Planning & Strategy",
        blurb:
          "A plan behind the numbers: business plans, financial models and strategy reviews for the decisions that shape the next few years.",
        overview:
          "Ambition needs a plan that holds up under scrutiny, whether it is a board wanting direction, a bank wanting projections, or you wanting to know the growth is fundable. We turn your goals into a costed, defensible plan built on your real numbers, and revisit it as things change.",
        included: [
          "Business plans: written to raise finance or steer the business",
          "Financial models: three-year P&L, balance sheet and cash flow",
          "Budgets and targets: set, then tracked against actuals",
          "Scenario planning: best, base and downside cases stress-tested",
          "Strategy reviews: pricing, margins and growth options weighed",
          "KPI frameworks: the handful of numbers that actually matter",
        ],
        bestFor: [
          "Founders planning their next growth phase",
          "Businesses preparing a bank or investor ask",
          "Owner-managers who want a plan, not just accounts",
        ],
        context:
          "A business plan earns its keep when it is more than a document for the bank. Built properly, it is the model you run the business against: what growth costs, when cash gets tight, which assumptions the whole thing rests on. We build it around your actual accounts rather than a template, so the projections are ones you can defend and act on.\n\nStrategy is where the plan meets the decisions: which products to push, what to charge, when to hire, whether to borrow. We sit with you, pressure-test the options against the numbers, and set a small set of KPIs so you can see early whether the plan is working. As the year unfolds and reality diverges from the forecast, we revisit it rather than filing it away.",
      },
    ],
  },
  {
    slug: "digital-transformation",
    title: "Digital Transformation",
    blurb:
      "Move off spreadsheets, onto a system that scales, with AI handling the repetitive work. The finance function, modernised.",
    overview:
      "Technology should take work off your plate, not add to it. We modernise finance operations end to end, migrating systems, automating the manual, and embedding AI where it earns its place. With Revenue’s real-time reporting and e-invoicing spreading across Europe, digital records are fast becoming the baseline, not the upgrade.",
    kind: "services",
    items: [
      {
        slug: "financial-transformation",
        title: "Financial Transformation",
        blurb:
          "Redesign finance processes and reporting so month-end close is faster, cleaner and built for scale.",
        overview:
          "Growing businesses outgrow their finance processes quietly, until close takes three weeks. We redesign the workflow, systems, controls and reporting, so the numbers arrive faster and you trust them more.",
        included: [
          "Process review: finance workflows redesigned end to end",
          "Faster close: month-end cut from weeks to days",
          "Management reporting: dashboards that answer real questions",
          "Controls: approval and sign-off workflows built in",
          "Systems roadmap: the right tools selected, in the right order",
          "Change management: the team trained and brought along",
        ],
        bestFor: [
          "Businesses where close takes too long",
          "Teams scaling past their spreadsheets",
          "Finance leads inheriting a mess",
        ],
        context:
          "Finance processes tend to be inherited rather than designed. They work at one size and quietly break at the next: month-end drags on, the numbers need caveats, and nobody fully trusts the report. The fix is rarely a single new tool; it’s redesigning how data flows from transaction to statement so the close is fast because it’s clean, not because someone worked the weekend.\n\nThere’s a compliance tailwind, too. Revenue’s real-time reporting and the spread of e-invoicing across Europe mean structured, digital finance data is becoming the baseline rather than a nice-to-have. We redesign the workflow, the controls and the reporting together, then bring the team along so the new way of working actually sticks.",
      },
      {
        slug: "erp-migration",
        title: "ERP Migration",
        blurb:
          "Plan and run your move to a modern ERP, Xero, NetSuite, Dynamics or Sage, without losing your data or your mind.",
        overview:
          "An ERP migration done badly can set you back a year. We scope the move, map and clean the data, run the migration in parallel, and stay on through go-live so the numbers reconcile from day one, with ROS-ready digital record-keeping built in.",
        included: [
          "ERP selection: the right platform for how you actually work",
          "Data migration: mapped, cleaned and moved across",
          "Chart of accounts: redesigned for the new system",
          "Parallel running: old and new reconciled before switch-off",
          "Integrations: existing tools and e-invoicing connected",
          "Go-live support: hands on through the switch, plus training",
        ],
        bestFor: [
          "Businesses outgrowing entry-level software",
          "Groups consolidating onto one system",
          "Anyone burned by a past migration",
        ],
        context:
          "Most ERP migrations don’t fail on the software; they fail on the data and the switch. Years of transactions, half of them with quirks nobody documented, have to be mapped to a new chart of accounts and moved without breaking your history or your VAT trail. Run it as a big-bang cutover with no parallel period and you find the problems in production, which is the worst place to find them.\n\nWe scope the move, clean and map the data, and run the old and new systems side by side until the numbers reconcile, then stay on through go-live. Digital, ROS-ready record-keeping is built in from the start, a requirement the new system meets on day one, rather than something retrofitted later.",
      },
      {
        slug: "ai-automation",
        title: "AI Automation",
        blurb:
          "Automate the repetitive finance work (invoice processing, reconciliations, approvals) so the team does judgement, not data entry.",
        overview:
          "A lot of finance work is repetitive and rules-based, exactly the kind of thing software handles better than people. We find those tasks and automate them (invoice capture, reconciliations, approvals, reporting) so the team spends its time where judgement is actually needed.",
        included: [
          "Automation assessment: the rules-based work identified first",
          "Invoice capture: receipts and bills read by OCR / AI",
          "Bank reconciliation: matched automatically, exceptions flagged",
          "Approval workflows: routing and sign-off automated",
          "Automated reporting: numbers and alerts on schedule",
          "Rollout: tools integrated and the team onboarded",
        ],
        bestFor: [
          "Teams drowning in manual data entry",
          "High-volume transaction businesses",
          "Finance functions under headcount pressure",
        ],
        context:
          "The finance work worth automating is the high-volume, rules-based kind: matching invoices, chasing receipts, coding transactions, reconciling the bank. It’s repetitive, it’s error-prone when people are tired, and it’s exactly what OCR and modern automation handle well. Automating it isn’t about cutting the team, it’s about pointing them at the work that needs judgement.\n\nWe start by measuring where the hours actually go, then automate the tasks with the best return first rather than trying to boil the ocean. Everything stays inside proper controls and approvals, because the point of taking people out of data entry is to put them back where they add value, reviewing, deciding, and catching the things a rule can’t.",
      },
      {
        slug: "ai-integration",
        title: "AI Integration",
        blurb:
          "Embed AI into your existing systems and workflows: connected to your real data, with the guardrails to trust it.",
        overview:
          "Generic AI tools rarely fit the way you actually work. We integrate AI into your real systems and data (forecasting, anomaly detection, document processing) with the controls and oversight to rely on the output.",
        included: [
          "Use-case discovery: the highest-value applications prioritised",
          "System integration: AI wired into your finance stack",
          "Custom models: trained on your own data, not generic",
          "Forecasting: anomaly detection and prediction built in",
          "Data pipelines: governed, documented and maintainable",
          "Guardrails: security, controls and human oversight",
        ],
        bestFor: [
          "Businesses with data but no AI strategy",
          "Teams piloting AI tools that don’t connect",
          "Leaders wanting AI with guardrails",
        ],
        context:
          "Generic AI tools demo well and disappoint in practice, because they don’t know your chart of accounts, your customers or your history. The value comes from connecting AI to your real data (forecasting on your actual cash patterns, flagging anomalies against your own baselines, reading your own documents) inside the systems you already use.\n\nThat only works with guardrails. Financial data needs access controls, an audit trail, and a human signing off anything that drives a decision or a filing. We build the integration and the governance together: the output is something you can rely on and defend, not a black box you have to take on trust.",
      },
    ],
  },
  {
    slug: "personal-finance",
    title: "Personal Finance",
    blurb:
      "How you earn decides your tax bill. We plan around your profession so you keep more of what you make.",
    overview:
      "Your tax position depends on how you earn. We tailor planning to your profession (the reliefs, structures and pitfalls specific to your work) so you keep more of it and sleep better at year-end.",
    kind: "personas",
    items: [
      {
        slug: "doctors",
        title: "Doctors and Medical Professionals",
        blurb:
          "Pension funding, private practice income and locum structuring for medics.",
        overview:
          "Medical careers create tax problems other professions never see: pension funding limits, mixed public (HSE) and private income, and locum work. We handle the specifics: income structure, reliefs and pension planning, worked out well before your return is due.",
        included: [
          "Pension planning: funding limits and retirement relief",
          "Mixed income: HSE and private practice earnings reconciled",
          "Locum work: consultancy and locum income structured",
          "Structure: sole trader vs limited company, decided on the numbers",
          "Form 11: the personal income tax return filed",
          "Reliefs: expenses, capital allowances and retirement planning",
        ],
        bestFor: [
          "Consultants with HSE and private income",
          "Locum doctors",
          "GPs running their own practice",
        ],
        context:
          "Medicine creates tax questions most professions never face. Consultants often earn through a mix of HSE salary and private practice income, which have to be reported and structured correctly; GPs frequently run a practice as a business in its own right; and locum work adds another layer again. A strong year can turn into a preliminary-tax shock if none of it has been planned for.\n\nPensions are where the biggest reliefs sit, and where the limits bite. Contributions attract tax relief up to age-related percentage limits, and the Standard Fund Threshold, the cap on a tax-relieved pension pot, rose to €2.2 million in 2026 and is set to climb in steps to €2.8 million by 2029, so timing matters, particularly later in a career. We handle the Form 11, the practice structure and the pension planning together, so retirement decisions get made on your schedule, not under year-end pressure.",
      },
      {
        slug: "it-professionals",
        title: "IT Workers and Professionals",
        blurb:
          "Contractor structuring and share-option taxation for tech workers and contractors.",
        overview:
          "Tech pay comes in forms Revenue treats very differently: contract income, RSUs, share options. We structure it properly and plan around capital gains (33% CGT) so equity doesn’t catch you out.",
        included: [
          "Contractor structuring: limited company set up properly",
          "PSC vs umbrella: the personal service company question answered",
          "Equity tax: RSUs and share options planned around",
          "Capital gains: 33% CGT on share disposals planned for",
          "Form 11: income tax returns and home-office claims",
          "Wealth: pension and investment planning",
        ],
        bestFor: [
          "Contract and freelance developers",
          "Employees with RSUs or options",
          "Consultants weighing limited vs umbrella",
        ],
        context:
          "Tech pay arrives in forms Revenue treats very differently. Salary is taxed under PAYE; contract income depends on whether you trade as a sole trader, through your own limited company, or via an umbrella; and equity (RSUs, options, ESPP) has its own timing and its own traps. RSUs are generally taxed as pay when they vest, and a later sale can bring a separate capital gains charge on top.\n\nCapital gains run at 33%, with only the first €1,270 of gains each year exempt, so selling vested shares needs planning rather than a panic in October. We get the trading structure right, plan the equity around the tax, and keep the Form 11 and preliminary tax on track throughout the year.",
      },
      {
        slug: "independent-contractors",
        title: "Independent Contractors",
        blurb:
          "End-to-end tax and bookkeeping for self-employed contractors: expenses and the right trading structure.",
        overview:
          "When you work for yourself, the admin is on you too. We take it off your plate (bookkeeping, expenses, returns) and keep you square with Revenue. Whatever your trade, we get the structure and the reliefs right, and plan preliminary tax well ahead of the deadline.",
        included: [
          "Structure: sole trader vs limited company, decided early",
          "RCT: Relevant Contracts Tax handled for construction work",
          "Books: bookkeeping and expense tracking kept current",
          "Form 11: the personal income tax return filed",
          "VAT: registration and returns once you cross the threshold",
          "Preliminary tax: planned ahead, due alongside the Form 11",
        ],
        bestFor: [
          "Self-employed trades and freelancers",
          "Construction subcontractors under RCT",
          "Anyone going limited for the first time",
        ],
        context:
          "Going out on your own means the admin comes with it. Whether you stay a sole trader or set up a limited company changes your tax, your paperwork and your exposure, so it’s worth deciding deliberately rather than by default. Once you’re trading, income tax is self-assessed on the Form 11, due by 31 October each year, a little later if you pay and file through ROS, and preliminary tax for the year ahead falls due at the same time, which is the bill that surprises people in their first full year.\n\nIf you work in construction, Relevant Contracts Tax (RCT) adds another layer, with deduction rates of 0%, 20% or 35% set by your compliance record. We keep the books, handle the returns and manage preliminary tax as a matter of course, well ahead of each deadline.",
      },
      {
        slug: "entrepreneurs",
        title: "Entrepreneurs and Founders",
        blurb:
          "Personal tax strategy for founders: remuneration, share schemes, reliefs and the path to exit.",
        overview:
          "For a founder, the business and your personal wealth move together. We plan remuneration, equity and reliefs across both: salary vs dividends, share schemes, and the exit reliefs that matter. Revised Entrepreneur Relief charges 10% CGT on qualifying gains up to a €1.5m lifetime limit (raised from €1m for disposals from January 2026), so timing and structure are worth real money.",
        included: [
          "Remuneration: salary and dividend mix planned",
          "Share schemes: KEEP options designed and administered",
          "Entrepreneur Relief: 10% CGT up to the €1.5m lifetime limit",
          "Exit timing: capital gains planned around the sale",
          "Alignment: personal and business tax pulled together",
          "Wealth: investment and succession planning",
        ],
        bestFor: [
          "Founders of growing companies",
          "Owners planning an exit",
          "Anyone balancing personal and business tax",
        ],
        context:
          "For a founder the business and your own finances are one system, and the tax works best when they’re planned together. How you pay yourself (salary versus dividends) affects both the company’s position and your personal bill, and a share scheme like KEEP lets you bring key people in on equity in a tax-efficient way rather than with cash you’d rather keep in the business.\n\nThe number that rewards planning most sits at exit. Revised Entrepreneur Relief charges 10% CGT on qualifying gains, and Budget 2026 raised the lifetime limit from €1 million to €1.5 million for disposals from January 2026, against a standard CGT rate of 33%. Getting the structure and the timing right ahead of a sale is worth real money, often more than a full year of trading profit.",
      },
    ],
  },
  {
    slug: "ai",
    title: "AI",
    blurb:
      "AI on real finance problems: forecasting, automation, tax. A chartered accountant signs off every output.",
    overview:
      "We put AI to work on real finance problems. Where it adds genuine value (forecasting, automation, tax analysis) we deploy it; where it doesn’t, we say so. Practical applications, measurable results, with a chartered accountant on every output.",
    kind: "services",
    items: [
      {
        slug: "finance",
        title: "AI for Finance",
        blurb:
          "AI-driven forecasting, reporting and analysis that turns your finance data into decisions.",
        overview:
          "There are answers in your finance data you don’t have time to dig for. We apply AI to surface them (cash-flow forecasting, anomaly detection, real-time reporting), turning last month’s numbers into an early view of next month’s.",
        included: [
          "Forecasting: AI cash-flow and revenue projections",
          "Anomaly detection: fraud and errors flagged early",
          "Real-time reporting: dashboards that stay current",
          "Scenario modelling: what-if analysis on demand",
          "Margin analysis: spend and profitability broken down",
          "Data setup: sources integrated and cleaned",
        ],
        bestFor: [
          "Businesses wanting forward-looking numbers",
          "Finance teams short on analysis time",
          "Leaders making data-led decisions",
        ],
        context:
          "Most finance teams are rich in data and poor in time to interrogate it. The monthly numbers tell you what already happened; the questions that matter (will cash hold up, which customers are slipping, where margin is leaking) need someone to dig, and the digging rarely gets done. That’s the gap AI is genuinely good at closing.\n\nWe apply it to your own figures: cash-flow and revenue forecasting built on your real patterns, anomaly detection that flags the odd transaction early, and reporting that stays current instead of being rebuilt every month. A chartered accountant reviews what it produces, because a forecast you’re going to act on needs judgement behind it, not just output.",
      },
      {
        slug: "business-automation",
        title: "AI for Business Model and Automation",
        blurb:
          "Rethink and automate how the business runs: workflows, pricing and operations powered by AI.",
        overview:
          "AI can reshape how the business earns, beyond simply running the back office more efficiently. We help you find those opportunities (automated operations, AI-driven pricing, new service lines) and build them in.",
        included: [
          "Opportunity assessment: where AI actually moves the model",
          "Operations: workflows automated end to end",
          "Pricing: AI-driven pricing and segmentation",
          "Analytics: customer and demand insight",
          "New revenue: service lines designed and costed",
          "Rollout: built, integrated and launched",
        ],
        bestFor: [
          "Businesses exploring AI opportunities",
          "Operations-heavy companies",
          "Leaders rethinking their model",
        ],
        context:
          "AI often gets bolted onto the back office when the bigger opportunity is in the business model itself: how you price, how you serve customers, what you can offer that wasn’t economic before. Automating operations frees up capacity; rethinking pricing or productising a service can change what the business is actually worth.\n\nWe look at both: the workflows worth automating now, and the model-level moves AI makes possible (dynamic pricing, demand analytics, new service lines). Then we build the ones with a real return, grounded in your numbers rather than in hype, so the change shows up in margin and not just in a slide deck.",
      },
      {
        slug: "taxation",
        title: "AI for Taxation",
        blurb:
          "AI-assisted tax analysis and optimisation: spot reliefs, model scenarios and cut compliance time.",
        overview:
          "Tax work is full of repetition and pattern-matching, the kind of thing AI genuinely helps with. We use it to scan for reliefs you’re missing, model the tax impact of decisions, and speed up compliance across the Irish tax regime, always with a chartered accountant signing off the output.",
        included: [
          "Relief discovery: allowances and reliefs surfaced by AI",
          "Scenario modelling: the tax impact of decisions, mapped",
          "Compliance checks: automated across the Irish tax regime",
          "Data extraction: documents and figures pulled automatically",
          "Risk flagging: anomalies caught before Revenue does",
          "Expert sign-off: a chartered accountant reviews every output",
        ],
        bestFor: [
          "Businesses with complex tax positions",
          "High-volume compliance work",
          "Anyone leaving reliefs unclaimed",
        ],
        context:
          "Irish tax is detailed, changes every Budget, and is full of reliefs that go unclaimed simply because nobody had time to check: R&D, capital allowances, various sector-specific measures. Much of the work of finding them is pattern-matching across documents and prior returns, which is exactly where AI earns its place.\n\nWe use it to scan for reliefs and allowances you may be missing, model the tax impact of a decision before you make it, and speed up routine compliance across the Irish regime. Nothing goes out on AI’s say-so, though: a chartered accountant reviews and signs off every position, because with Revenue the responsibility is yours and the answer has to be right.",
      },
    ],
  },
  {
    slug: "cfo-service",
    title: "Fractional CFO",
    blurb:
      "A finance director for a few days a month. Forecasts, board packs and funding support, without the salary.",
    overview:
      "Most businesses don’t need a full-time finance director; they need a few hours of a great one, armed with current numbers. We build the forecast, sit in the board meeting, and tell you what the numbers mean for the decision in front of you.",
    kind: "services",
    items: [
      {
        slug: "cash-flow-forecasting",
        title: "Cash Flow & Forecasting",
        blurb:
          "Rolling cash-flow and P&L forecasts kept current, so you see the squeeze before it arrives.",
        overview:
          "Most cash crises are visible months ahead if someone is looking. We build a rolling forecast off your live numbers and keep it current, so you know your runway, your funding gap and your best and worst cases before they land.",
        included: [
          "Cash-flow forecast: rolling 12-week and 12-month views",
          "P&L forecast: revenue, margin and overhead projected",
          "Scenario modelling: best, base and downside cases",
          "Runway tracking: how long the cash lasts, updated monthly",
          "Assumption reviews: the forecast challenged, not just rolled",
          "Variance analysis: forecast vs actual, explained",
        ],
        bestFor: [
          "Businesses with lumpy or seasonal cash flow",
          "Companies approaching a funding gap",
          "Founders scaling and watching the runway",
        ],
        context:
          "A forecast is only useful if it is current and honest. We build yours from live bookkeeping, not a spreadsheet frozen at last year-end, and keep both a short 12-week cash view and a longer 12-month P&L and cash forecast running. That combination shows the immediate squeeze and the bigger trajectory at the same time.\n\nThe value is in the assumptions. We stress-test the ones the business rests on (collection times, pipeline conversion, hiring pace) and show how the numbers behave when they move against you. Each month we compare forecast to actual, explain the variance and update the view, so the forecast stays a decision tool rather than a document.",
      },
      {
        slug: "board-investor-reporting",
        title: "Board & Investor Reporting",
        blurb:
          "Board packs and investor updates your directors and backers actually trust: clear, consistent and on time.",
        overview:
          "Boards and investors judge you partly on the quality of your reporting. We produce the monthly or quarterly pack (numbers, KPIs and a plain-English narrative) so every meeting starts from an agreed, credible set of figures.",
        included: [
          "Board packs: financials, KPIs and commentary in one document",
          "Investor updates: consistent monthly or quarterly reporting",
          "KPI dashboards: the metrics your board actually watches",
          "Management accounts: P&L, balance sheet and cash, reconciled",
          "Budget vs actual: performance against plan, explained",
          "In the room: attendance to talk the board through it",
        ],
        bestFor: [
          "Companies with a board or investors to report to",
          "Businesses post-raise with reporting obligations",
          "Founders who want meetings to start from agreed numbers",
        ],
        context:
          "A good board pack does two jobs: it gives directors and investors confidence that the numbers are under control, and it frames the decisions the meeting needs to make. We build a consistent pack (management accounts, the KPIs that matter for your business, budget-versus-actual and a short narrative) so nobody is arguing about the figures before the discussion even starts.\n\nConsistency is what builds trust over time. Reporting the same metrics the same way each period lets your board see trends rather than snapshots, and makes the next raise or refinance easier because the track record is already there. We can prepare the pack, or prepare it and sit in the meeting to talk it through.",
      },
      {
        slug: "fundraising-support",
        title: "Fundraising & Refinancing Support",
        blurb:
          "The numbers, projections and answers lenders and investors need, prepared so a raise or refinance goes smoothly.",
        overview:
          "Raising debt or equity is won or lost on the quality of your numbers and how you defend them. We prepare the model, the projections and the supporting analysis, and stand behind them through diligence, so you go in credible and come out funded.",
        included: [
          "Financial projections: models built to a funder’s standard",
          "Funding applications: bank, grant and investor submissions",
          "Business case: the ask costed and justified",
          "Diligence support: questions from lenders and investors handled",
          "Cap table and scenarios: dilution and repayment modelled",
          "Lender liaison: the finance conversation, on your side",
        ],
        bestFor: [
          "Businesses raising debt or equity",
          "Companies refinancing existing facilities",
          "Founders heading into diligence",
        ],
        context:
          "Funders back numbers they can trust. Whether it is a bank term loan, a State-backed facility or an equity round, they want projections that hold together, assumptions that are defensible and a business case that shows how their money gets used and repaid. We build that around your real accounts and pressure-test it before it goes out, so weaknesses get found by us rather than by them.\n\nDiligence is where deals slow down or fall over. We prepare the supporting analysis (the cap table, repayment and dilution scenarios, the answers to the questions that always come) and stay in the finance conversation alongside you. The aim is a process that moves quickly because the numbers were right the first time.",
      },
      {
        slug: "valuations-exit",
        title: "Valuations & Exit Planning",
        blurb:
          "What the business is worth, and how to prepare it for a sale or handover when the time comes.",
        overview:
          "A business is usually an owner’s biggest asset, yet most only find out what it is worth when they are already selling. We value it properly and, if an exit or succession is on the horizon, prepare it so you keep more of the proceeds and the handover goes cleanly.",
        included: [
          "Business valuations: for a sale, share transfer or dispute",
          "Exit readiness: the business prepared to sell well",
          "Succession planning: handover to family or management",
          "Tax on exit: retirement and entrepreneur relief planned early",
          "Deal support: alongside you through the transaction",
          "Post-exit: the proceeds and your position sorted",
        ],
        bestFor: [
          "Owners thinking about a sale in the next few years",
          "Family businesses planning succession",
          "Shareholders needing a valuation",
        ],
        context:
          "Value is not a single number; it depends on why you are asking (a trade sale, a share buyout, a family handover, a dispute) and on how ready the business is to stand on its own. We value it on a basis that fits the purpose and, just as important, tell you what is dragging the value down and what a buyer will want to see.\n\nThe tax on an exit is where preparation pays off. Reliefs such as Retirement Relief and Revised Entrepreneur Relief can materially cut the CGT on a sale, but they reward planning done years ahead, not weeks. We map the timing and the structure early, prepare the business so it sells well, and stay alongside you through the deal so the outcome matches the plan.",
      },
    ],
  },
  {
    slug: "outsourcing",
    title: "Outsourcing",
    blurb:
      "Hand us the finance function, bookkeeping through to management accounts, and run lean. We become your back office.",
    overview:
      "Hiring a full finance team is slow and expensive. We run all or part of yours as an extension of your business (bookkeeping, payroll, reporting, controls) for a fraction of the cost of building it in-house.",
    kind: "services",
    items: [
      {
        slug: "outsourced-bookkeeping",
        title: "Outsourced Bookkeeping",
        blurb:
          "Your day-to-day bookkeeping processed and reconciled by us, so the numbers are always current and audit-ready.",
        overview:
          "Bookkeeping that falls behind poisons everything downstream: VAT, payroll, decisions. We run it as your back office (transactions processed, accounts reconciled, records kept ROS-ready) so you always have a current, reliable set of books.",
        included: [
          "Transaction processing: sales, purchases and expenses coded",
          "Bank reconciliation: every account reconciled, on schedule",
          "Cloud accounting: run in Xero, QuickBooks or Sage",
          "VAT-ready records: kept correct between returns",
          "Document handling: receipts and invoices captured and filed",
          "Named contact: a bookkeeper who knows your business",
        ],
        bestFor: [
          "Businesses without an in-house bookkeeper",
          "Owners doing the books at night",
          "Companies moving to cloud accounting",
        ],
        context:
          "When the books fall behind, everything built on them wobbles: the VAT return is a scramble, the management accounts are guesswork, and decisions get made on stale numbers. We take the function off your desk and run it properly (coding transactions, reconciling every account, keeping the records ROS-ready) on Xero, QuickBooks or Sage.\n\nBecause we do it continuously rather than in a year-end rush, the books stay current and the surprises disappear. You get a named bookkeeper who knows your business, not a rotating queue, and clean data feeding straight into VAT, payroll, management accounts and the year-end file.",
      },
      {
        slug: "payroll-payments",
        title: "Payroll & Supplier Payments",
        blurb:
          "Staff and suppliers paid accurately and on time, with PAYE and payroll compliance handled end to end.",
        overview:
          "Getting people paid, correctly and on time, is non-negotiable, and Irish PAYE runs in real time with Revenue. We run the payroll cycle and, if you want, manage supplier payments too, so the money goes out right and the filings take care of themselves.",
        included: [
          "Payroll processing: weekly, fortnightly or monthly runs",
          "PAYE Modernisation: real-time submissions to Revenue",
          "Payslips: distributed securely to your team",
          "Statutory deductions: PAYE, PRSI and USC handled",
          "Supplier payments: approved runs prepared and made",
          "Starters and leavers: onboarded and processed correctly",
        ],
        bestFor: [
          "Businesses with employees on payroll",
          "Companies wanting payments handled hands-off",
          "Owners tired of the monthly payroll scramble",
        ],
        context:
          "Irish payroll operates under PAYE Modernisation, which means Revenue expects a submission every time you pay staff, not once a year. Get it wrong and the corrections and queries pile up. We run the full cycle (calculations, payslips, PAYE, PRSI and USC, and the real-time submissions) so employees are paid correctly and Revenue is satisfied automatically.\n\nBeyond payroll, we can take on supplier payments too: preparing approved payment runs, keeping to terms and making sure nothing important slips. It is the part of the finance function that has to happen on time every period, run by a team that treats it that way, with a named contact you can reach.",
      },
      {
        slug: "management-accounts",
        title: "Management Accounts & Reporting",
        blurb:
          "Monthly management accounts that tell you how the business is actually doing, not just what it filed.",
        overview:
          "Statutory accounts look backwards once a year; management accounts tell you what is happening now. We produce a monthly pack (P&L, balance sheet, cash and the KPIs that matter) reconciled and on time, so you are steering with current numbers.",
        included: [
          "Monthly accounts: P&L, balance sheet and cash flow",
          "KPI reporting: the metrics that drive your business",
          "Budget vs actual: performance against plan, explained",
          "Margin analysis: where you make and lose money",
          "Commentary: a plain-English read on the month",
          "Reconciled numbers: figures you can rely on",
        ],
        bestFor: [
          "Businesses making decisions between year-ends",
          "Companies with a board or lender to update",
          "Owners who want numbers they can act on",
        ],
        context:
          "Waiting for the year-end accounts to see how the business did is like driving by the rear-view mirror. Management accounts close that gap: a monthly, reconciled read on profit, cash and the handful of KPIs that actually move your business, delivered while there is still time to act on it.\n\nWe produce the pack consistently (same format, same metrics, on a set date) with budget-versus-actual and a short commentary, so the numbers come with a read, not just a spreadsheet. It feeds board and lender reporting, and it is the difference between reacting to last year and managing this month.",
      },
      {
        slug: "credit-control",
        title: "Credit Control & Receivables",
        blurb:
          "Invoices chased and cash collected, professionally and persistently, so your money does not sit in someone else’s account.",
        overview:
          "Profit on paper does not pay wages; collected cash does. We run credit control as your back office (issuing invoices, chasing politely but persistently, and keeping the ledger clean) so your cash comes in on terms.",
        included: [
          "Invoicing: raised accurately and issued promptly",
          "Statements and reminders: sent on a set schedule",
          "Debtor chasing: followed up by phone and email",
          "Aged debt reporting: who owes what, and how late",
          "Terms and credit checks: risk flagged before it bites",
          "Cash allocation: receipts matched and reconciled",
        ],
        bestFor: [
          "Businesses carrying too much in debtors",
          "Companies with slow-paying customers",
          "Owners who hate chasing their own clients",
        ],
        context:
          "Late payment is one of the biggest, quietest drains on a small business: the sale is made, the work is done, but the cash sits in the customer’s account instead of yours. A consistent chase process (statements, reminders and follow-up on a schedule) collects far more than the occasional awkward phone call, and it does it without straining the relationship.\n\nWe run it as an extension of your business: issuing invoices promptly, following up politely but persistently, flagging risky accounts before they become bad debts, and keeping the sales ledger reconciled so you always know your real receivables. The point is simple: turn profit on paper into cash in the bank.",
      },
    ],
  },
  {
    slug: "crypto",
    title: "Crypto and Digital Assets",
    blurb:
      "Crypto gains, staking, mining and DeFi: calculated, reported and planned. Ahead of the CARF rules landing in 2026.",
    overview:
      "Crypto tax is complex, fast-moving and easy to get wrong, and the days of it going unnoticed are over. In Ireland, disposals are subject to 33% Capital Gains Tax above the €1,270 annual exemption, while income from staking, mining or airdrops can be taxable at your marginal rate. Under the OECD Crypto-Asset Reporting Framework (CARF), exchanges begin collecting data in 2026 and reporting it to Revenue from 2027, so accurate records are no longer optional. We calculate, report and plan it properly.",
    kind: "services",
    items: [
      {
        slug: "crypto-cgt",
        title: "Crypto Capital Gains Tax",
        blurb:
          "Gains across every wallet and exchange calculated and filed correctly: 33% CGT above the €1,270 exemption.",
        overview:
          "Selling, swapping or spending crypto is a disposal for Irish CGT, taxed at 33% on the gain above the €1,270 annual exemption. We pull together every wallet and exchange, calculate the gains properly and file through ROS, so the number is right and defensible.",
        included: [
          "Gains calculation: disposals across all wallets and exchanges",
          "CGT return: filed via ROS or Form CG1",
          "Exemption and losses: the €1,270 exemption and losses applied",
          "Cost basis: acquisition costs tracked correctly",
          "Payment dates: CGT payment deadlines met",
          "Revenue queries: correspondence handled on your behalf",
        ],
        bestFor: [
          "Investors and traders across multiple exchanges",
          "Anyone who has sold, swapped or spent crypto",
          "People facing a Revenue query on crypto",
        ],
        context:
          "Ireland taxes crypto under the ordinary CGT rules, which is what trips people up. A disposal is not just cashing out to euro: swapping one token for another, or spending crypto, is a disposal too, taxable at 33% on the gain above the €1,270 annual exemption. Every wallet and exchange has to be brought together, with the right acquisition cost against each disposal, to get the figure right.\n\nThe deadlines are their own trap: CGT on gains in the first eleven months of the year is due in December, with the return itself the following year. We calculate the gains across your full activity, apply the exemption and any losses, file through ROS and keep you to the payment dates, so the position is clean before Revenue ever asks.",
      },
      {
        slug: "crypto-income",
        title: "Staking, Mining & DeFi Income",
        blurb:
          "Rewards from staking, mining, airdrops and DeFi classified correctly: income tax now, CGT later, kept apart.",
        overview:
          "Not all crypto is a capital gain. Staking rewards, mining, airdrops and much of DeFi can be income, taxable at your marginal rate when received, and then a CGT asset afterwards. We classify each stream correctly so you are taxed once, on the right basis.",
        included: [
          "Income classification: staking, mining, airdrops and DeFi",
          "Marginal-rate tax: income valued and reported when received",
          "CGT on later disposal: the second event tracked separately",
          "DeFi activity: lending, liquidity and yield untangled",
          "Record building: reward events captured and valued",
          "Form 11: crypto income filed with your return",
        ],
        bestFor: [
          "Stakers, miners and yield farmers",
          "Anyone receiving airdrops or DeFi rewards",
          "Active DeFi users with tangled histories",
        ],
        context:
          "The hardest part of crypto tax is not the gains; it is telling income from capital. Rewards from staking, mining or airdrops are generally taxable as income at your marginal rate, valued at the moment you receive them. That same crypto then becomes a CGT asset, so disposing of it later is a second, separate taxable event. Miss the distinction and you either overpay or leave a gap Revenue will find.\n\nDeFi makes this harder again: lending, liquidity provision and yield can each be characterised differently, and the transaction history is often a tangle across protocols. We work through the activity, classify each stream on the right basis, value the reward events, and make sure the income goes on your Form 11 and the later disposals are tracked for CGT, so nothing is taxed twice and nothing is missed.",
      },
      {
        slug: "carf-reporting",
        title: "CARF & DAC8 Reporting Readiness",
        blurb:
          "Get your records straight before exchanges start reporting to Revenue under CARF and DAC8 from 2026/27.",
        overview:
          "The days of crypto going unnoticed are ending. Under the OECD’s CARF and the EU’s DAC8, exchanges begin collecting user data in 2026 and reporting it to Revenue from 2027. We get your historic position straight and filed before that data arrives, not after.",
        included: [
          "Position review: historic activity assessed for exposure",
          "Voluntary disclosure: unreported gains regularised properly",
          "Record readiness: your data aligned with what exchanges report",
          "Gap analysis: missing years and wallets identified",
          "Ongoing compliance: a process that keeps you current",
          "Revenue liaison: disclosures and queries handled",
        ],
        bestFor: [
          "Long-term holders with unreported history",
          "Anyone unsure their past filings were complete",
          "Investors wanting to get ahead of CARF",
        ],
        context:
          "The big change in crypto is not a new tax; it is visibility. Under the OECD Crypto-Asset Reporting Framework (CARF) and the EU’s DAC8, exchanges begin collecting user data in 2026 and reporting it to Revenue from 2027. Positions that once went unseen will be matched against your returns automatically, so a gap that was invisible becomes a question with your name on it.\n\nGetting ahead of that is far cheaper than being caught by it. We review your historic activity, identify the missing years and wallets, and where there is unreported tax we regularise it properly through a voluntary disclosure, which carries far lighter consequences than a Revenue-initiated intervention. Then we put a process in place so your records stay aligned with what the exchanges will report.",
      },
      {
        slug: "portfolio-reconstruction",
        title: "Portfolio Reconstruction & Reconciliation",
        blurb:
          "Years of scattered wallets and dead exchanges rebuilt into one reconciled history you can actually file from.",
        overview:
          "You cannot report what you cannot reconstruct. Where records are scattered across wallets, exchanges and defunct platforms, we rebuild the full transaction history, reconcile it and turn it into a clean basis for tax, once and properly.",
        included: [
          "Data gathering: exports from every wallet and exchange",
          "History reconstruction: transactions rebuilt across platforms",
          "Reconciliation: balances tied out to holdings",
          "Missing data: gaps from dead exchanges reconstructed",
          "Cost basis: acquisition costs established per asset",
          "Report-ready output: a clean basis for CGT and income",
        ],
        bestFor: [
          "Long-term investors with fragmented records",
          "Anyone who used exchanges that have shut down",
          "People starting from a mess of CSVs and wallets",
        ],
        context:
          "Most crypto tax problems are really data problems. After a few years, activity is scattered across current wallets, old exchanges (some of which no longer exist) and a pile of inconsistent CSV exports. Without a reconciled history, any tax figure is a guess, and a guess is exactly what Revenue will not accept.\n\nWe rebuild it: gathering exports from every source, reconstructing the transaction history across platforms, filling gaps left by defunct exchanges, and reconciling the result to your actual holdings so it ties out. What you get back is a single, clean, report-ready history with cost bases established, ready to file CGT and income from with confidence.",
      },
    ],
  },
];

export function getCategory(slug: string): ServiceCategory | undefined {
  return serviceCategories.find((category) => category.slug === slug);
}

/** Category + sub-service slug pairs that have a detail page (excludes coming-soon and single). */
export function getServiceParams(): { category: string; slug: string }[] {
  return serviceCategories
    .filter((category) => category.status !== "coming-soon")
    .flatMap((category) =>
      category.items.map((item) => ({ category: category.slug, slug: item.slug })),
    );
}
