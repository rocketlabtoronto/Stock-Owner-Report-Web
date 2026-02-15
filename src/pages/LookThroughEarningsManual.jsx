import React from "react";
import PropTypes from "prop-types";
import CustomBox from "components/CustomBox";
import CustomTypography from "components/CustomTypography";
import DashboardLayout from "ui/LayoutContainers/DashboardLayout";
import DashboardNavbar from "ui/Navbars/DashboardNavbar";

function StockOwnersReportManual() {
  const accentColor = "#1a4b8f";
  const containerStyle = {
    backgroundColor: "#ffffff",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
    borderRadius: "20px",
    border: "1px solid rgba(15, 23, 42, 0.06)",
    fontFamily: "inherit",
    lineHeight: 1.5,
    fontSize: 14,
    color: "#111827",
  };

  const headingStyle = {
    fontFamily: "inherit",
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.2,
    marginBottom: 16,
  };

  const bodyStyle = {
    fontFamily: "inherit",
    fontSize: 14,
    color: "#475569",
    lineHeight: 1.5,
    marginBottom: 16,
  };

  const sectionDivider = {
    borderTop: "1px solid #e2e8f0",
    paddingTop: 24,
    marginTop: 24,
  };

  const highlightBox = {
    backgroundColor: "#eef3ff",
    padding: 16,
    margin: "16px 0",
    borderLeft: `4px solid ${accentColor}`,
    fontSize: 14,
    fontStyle: "italic",
    color: accentColor,
    borderRadius: 12,
  };

  const exampleBox = {
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 20,
    margin: "20px 0",
  };

  const listStyle = {
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 0,
    listStyle: "none",
    paddingLeft: 0,
  };

  const listItemStyle = {
    marginBottom: 8,
    position: "relative",
    paddingLeft: 24,
  };

  const bulletStyle = {
    position: "absolute",
    left: 0,
    fontWeight: "bold",
  };

  const Body = ({ children, style, ...props }) => (
    <CustomTypography variant="body1" style={{ ...bodyStyle, ...style }} {...props}>
      {children}
    </CustomTypography>
  );

  const SectionTitle = ({ children, style }) => (
    <CustomTypography
      variant="h3"
      style={{
        ...headingStyle,
        fontSize: 22,
        marginBottom: 16,
        ...style,
      }}
    >
      {children}
    </CustomTypography>
  );

  const Highlight = ({ children }) => <div style={highlightBox}>{children}</div>;

  const ExampleBox = ({ children }) => <div style={exampleBox}>{children}</div>;

  const BulletList = ({ items, bulletColor = accentColor, listOverrides = {}, itemOverrides = {} }) => (
    <ul style={{ ...listStyle, ...listOverrides }}>
      {items.map((item, index) => {
        const isConfig =
          item && typeof item === "object" && Object.prototype.hasOwnProperty.call(item, "content");
        const content = isConfig ? item.content : item;
        const color = isConfig && item.bulletColor ? item.bulletColor : bulletColor;

        return (
          <li key={index} style={{ ...listItemStyle, ...itemOverrides }}>
            <span style={{ ...bulletStyle, color }}>•</span>
            {content}
          </li>
        );
      })}
    </ul>
  );

  Body.propTypes = {
    children: PropTypes.node.isRequired,
    style: PropTypes.object,
  };

  SectionTitle.propTypes = {
    children: PropTypes.node.isRequired,
    style: PropTypes.object,
  };

  Highlight.propTypes = {
    children: PropTypes.node.isRequired,
  };

  ExampleBox.propTypes = {
    children: PropTypes.node.isRequired,
  };

  BulletList.propTypes = {
    items: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.node, PropTypes.object])).isRequired,
    bulletColor: PropTypes.string,
    listOverrides: PropTypes.object,
    itemOverrides: PropTypes.object,
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <CustomBox py={3}>
        <CustomBox
            px={{ xs: 2, sm: 3, md: 4 }}
            py={4}
            maxWidth={820}
          width="100%"
          mr="auto"
          style={containerStyle}
          className="owner-manual"
        >
          <style>{`
            .owner-manual [style*="#bfa14a"] {
              color: ${accentColor} !important;
              border-color: ${accentColor} !important;
            }
          `}</style>
          {/* Hero Section */}
          <CustomTypography
            variant="h1"
            style={{
              ...headingStyle,
              fontSize: 30,
              fontWeight: 700,
              marginBottom: 20,
              borderBottom: "3px solid #1a4b8f",
              paddingBottom: 16,
            }}
          >
            The Stock Owner&apos;s Report: Proportionate Share Earnings — Investing Like a Business Owner, Not
            a Speculator
          </CustomTypography>

          <Highlight>
            &quot;We regard look-through earnings as a much better gauge of economic reality than GAAP
            earnings.&quot;
            <br />
            <span style={{ fontStyle: "normal", fontWeight: 600, color: "#111827" }}>
              — Warren Buffett, Berkshire Hathaway Shareholder Letter
            </span>
          </Highlight>

          {/* Mindset Section */}
          <div style={sectionDivider} />
          <SectionTitle>
            <em>Your</em>{" "}
            Mindset Is Everything: Owner vs. Speculator
          </SectionTitle>
          <Body>
            Most people approach the stock market like a casino. They try to predict price movements.
            They buy because they hope someone will pay more tomorrow.
          </Body>
          <Body>
            But business owners don&apos;t think this way. Owners care about:
            <BulletList
              items={[
                "What the business earns",
                "What it reinvests (and how well it reinvests)",
                "What that means for long-term value per share",
              ]}
            />
          </Body>
          <Body>Our motto is:</Body>
          <Highlight>&quot;Invest in Stocks Like a Business Owner.&quot;</Highlight>
          <Body>
            The bridge between &quot;I own shares&quot; and &quot;I own a business&quot; is a single idea:
            <strong> your proportionate share.</strong> When you see your holdings as a proportionate share of real
            earnings, assets, and cash flows, the market becomes less confusing — and your decision-making becomes
            more rational.
          </Body>

          {/* Why Proportionate Share Matters */}
          <div style={sectionDivider} />
          <SectionTitle>Why Proportionate Share Matters</SectionTitle>

          <Body>
            Proportionate share is the owner&apos;s unit of measurement. It answers the question that
            price charts cannot:
            <strong> what portion of this business&apos;s results belongs to me?</strong>
          </Body>

          <Body>
            Knowing your proportionate share matters because it changes what you optimize for:
            <BulletList
              items={[
                {
                  content: (
                    <>
                      <strong>It anchors you to fundamentals.</strong> Your wealth is driven by the economics of the
                      underlying businesses — not by day-to-day quotes.
                    </>
                  ),
                },
                {
                  content: (
                    <>
                      <strong>It exposes the hidden compounding.</strong> If a company retains earnings and reinvests
                      well, your proportionate share of future earnings can grow even if dividends are small.
                    </>
                  ),
                  bulletColor: "#bfa14a",
                },
                {
                  content: (
                    <>
                      <strong>It makes valuation concrete.</strong> A stock price is only meaningful relative to the
                      earnings and cash flows your proportionate share represents.
                    </>
                  ),
                  bulletColor: "#bfa14a",
                },
                {
                  content: (
                    <>
                      <strong>It reduces emotional trading.</strong> When your dashboard is &quot;earnings owned&quot; instead
                      of &quot;price moved,&quot; volatility becomes information — not a trigger.
                    </>
                  ),
                  bulletColor: "#bfa14a",
                },
              ]}
            />
          </Body>

          <Highlight>
            The market can change its opinion daily. Your proportionate share of the business changes only when the
            business changes — or when you change how much you own.
          </Highlight>

          {/* Mr. Stock Owner vs Mr. Market */}
          <div style={sectionDivider} />
          <SectionTitle>Meet Mr. Stock Owner and Mr. Market</SectionTitle>
          <Body>These are two imaginary characters that represent how people think about stocks.</Body>

          <ExampleBox>
            <CustomTypography
              variant="h5"
              style={{
                ...headingStyle,
                fontSize: 18,
                color: "#bfa14a",
                marginBottom: 10,
              }}
            >
              Mr. Stock Owner (Buffett&apos;s ideal investor)
            </CustomTypography>
            <BulletList
              bulletColor="#bfa14a"
              listOverrides={{ margin: 0, paddingLeft: 0 }}
              items={[
                "Thinks like a business owner.",
                <>
                  Measures his <strong>proportionate share</strong> of the real earnings of companies he owns.
                </>,
                "Doesn&apos;t care about short-term stock prices.",
                "Focuses on retained earnings, reinvestment returns, and intrinsic value.",
              ]}
            />
          </ExampleBox>

          <ExampleBox>
            <CustomTypography
              variant="h5"
              style={{
                ...headingStyle,
                fontSize: 18,
                color: "#bfa14a",
                marginBottom: 10,
              }}
            >
              Mr. Market (from Benjamin Graham)
            </CustomTypography>
            <BulletList
              bulletColor="#bfa14a"
              listOverrides={{ margin: 0, paddingLeft: 0 }}
              items={[
                "Is manic, emotional, and short-sighted.",
                "Offers you a price every day — sometimes too high, sometimes too low.",
                "Is your servant, not your guide.",
                "Obsessively watches charts but ignores what the business is actually earning.",
              ]}
            />
          </ExampleBox>

          <Body>
            To succeed as an investor, you must ignore Mr. Market and embrace the clarity of Mr. Stock Owner.
          </Body>

      {/* What Are Proportionate-Share Earnings? */}
      <div style={sectionDivider} />
      <SectionTitle>What Are Proportionate-Share Earnings?</SectionTitle>
      <Body>
        Speculators focus on:
        <BulletList
          bulletColor="#bfa14a"
          items={["Stock price movements", "Daily news cycles", "Market sentiment and trading volume"]}
        />
        But that&apos;s not how an owner thinks.
      </Body>
      <Body>
        Proportionate-share earnings reflect:
        <BulletList
          bulletColor="#bfa14a"
          items={[
            <>
              Your <strong>proportionate share</strong> of the profits earned by the companies you own — whether or not
              those profits are paid out to you as dividends.
            </>,
          ]}
        />
        This includes:
        <BulletList
          bulletColor="#bfa14a"
          items={[
            "Your share of reported earnings (where applicable)",
            "Your share of retained earnings (profits the company keeps and reinvests)",
            "Dividends received",
          ]}
        />
        The key point: retained earnings are still <em>owned</em> by shareholders. If management reinvests retained
        earnings effectively, your proportionate share of future profits can grow — even if the market price is noisy
        in the short term.
      </Body>

      {/* Why Retained Earnings Matter */}
      <div style={sectionDivider} />
      <SectionTitle>Why Retained Earnings Matter</SectionTitle>
      <Body>
        Smart companies retain and reinvest profits for growth — building future earnings per share and long-term
        value.
      </Body>
      <Body>
        Many investors mentally equate &quot;return&quot; with &quot;dividend.&quot; That is a mistake. Owners
        understand: earnings can be distributed or retained. Either way, the earnings belong to the owners. What
        matters is whether retained earnings are reinvested at attractive rates of return.
      </Body>
      <Highlight>
        &quot;Many of the businesses we own retain all earnings. These earnings do not hit our
        income statement but are building our wealth nonetheless.&quot;
        <br />
        <span style={{ fontStyle: "normal", fontWeight: 600, color: "#1a1a1a" }}>
          — Warren Buffett
        </span>
      </Highlight>
      <Body>This is the economic substance — and what a true owner cares about.</Body>

      {/* Example: What a Speculator Sees vs. What an Owner Sees */}
      <div style={sectionDivider} />
      <SectionTitle style={{ borderLeft: "4px solid #bfa14a", paddingLeft: 16 }}>
        Example: What a Speculator Sees vs. What an Owner Sees
      </SectionTitle>

      <ExampleBox>
        <Body>
          Let&apos;s say you invest $10,000 in a small public company called Acme Tools. The company has a market cap
          of $1 million and earns $100,000 per year in profit, giving it a starting P/E ratio of 10 (Price divided by
          Earnings).<br></br>
          The stock price is $10/share, so there are 100,000 shares outstanding.
          <br />
          <br />
          Your $10,000 investment buys 1,000 shares, or 1% ownership of the company.
          <br />
          Acme pays out 25% of its earnings as dividends and reinvests the rest.
          <br />
          Your proportionate share of earnings is 1% of $100,000 = $1,000.
          <br />
          You receive $250 in dividends (25% payout ratio).
          <br />
          <br />
          The company reinvests $750 of your share back into the business to grow future earnings.
        </Body>
        <Body style={{ fontWeight: 600, color: "#000000ff" }}>
          However, this year the stock price dropped 15%, falling from $10/share to $8.50/share. You think your
          investment is now worth $8,500. Is it?
        </Body>
      </ExampleBox>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, margin: "20px 0" }}>
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <CustomTypography
            variant="h5"
            style={{
              ...headingStyle,
              fontSize: 16,
              color: "#1f2937",
              marginBottom: 10,
            }}
          >
            What a Speculator Sees:
          </CustomTypography>
          <CustomTypography variant="body2" style={{ fontSize: 14, color: "#475569", lineHeight: 1.45 }}>
            &quot;Ugh, my portfolio is down 15%.&quot;
            <br />
            <br />
            &quot;This company is losing value. I should cut my losses.&quot;
            <br />
            <br />
            <em>Focused only on price decline, not business fundamentals.</em>
          </CustomTypography>
        </div>

        <div
          style={{
            backgroundColor: "#eef3ff",
            border: "1px solid #c7d7f5",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <CustomTypography
            variant="h5"
            style={{
              ...headingStyle,
              fontSize: 16,
              color: "#1a4b8f",
              marginBottom: 10,
            }}
          >
            What an Owner Sees:
          </CustomTypography>
          <CustomTypography variant="body2" style={{ fontSize: 14, color: "#1e3a8a", lineHeight: 1.45 }}>
            &quot;I invested $10,000 and my proportionate share earned $1,000 this year — that&apos;s a 10% return
            from real business profits.&quot;
            <br />
            <br />
            &quot;I received $250 in cash dividends, and $750 is still working inside the company — growing the value
            of my ownership.&quot;
            <br />
            <br />
            &quot;The market price dropped, but the business didn&apos;t stop earning. If fundamentals hold, it may
            be more attractively priced now.&quot;
            <br />
            <br />
            &quot;A lower P/E ratio means I can buy more earnings per dollar invested — if the business remains
            healthy.&quot;
          </CustomTypography>
        </div>
      </div>

      <Body style={{ fontWeight: 500, fontSize: 16 }}>
        The speculator sees a paper loss. But the owner sees steady value creation. By focusing on your proportionate
        share of earnings, you think like a business owner — and make more rational, long-term decisions.
        <br />
        <br />
        <span style={{ color: "#bfa14a", fontWeight: 600 }}>That&apos;s the owner&apos;s lens.</span>
      </Body>

      {/* Example: The Dividend Trap */}
      <div style={sectionDivider} />
      <SectionTitle style={{ borderLeft: "4px solid #bfa14a", paddingLeft: 16 }}>
        Example: The Dividend Trap
      </SectionTitle>

      <ExampleBox>
        <Body>
          Let&apos;s say you invest $10,000 in a company called YieldMax Corp, a public company that pays a high
          dividend. The company has a market cap of $2 million and reports $100,000 in annual profit.
        </Body>
        <Body>
          The stock price is $20/share, with 100,000 shares outstanding.
          <br />
          <br />
          Your $10,000 buys 500 shares, or 0.5% ownership.
          <br />
          <br />
          YieldMax has a 100% payout ratio, meaning it pays out all its earnings as dividends.
          <br />
          <br />
          You receive $500 in dividends (0.5% of $100,000). The stock price hasn&apos;t moved much, but let&apos;s
          look deeper.
        </Body>
      </ExampleBox>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, margin: "20px 0" }}>
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <CustomTypography
            variant="h5"
            style={{
              ...headingStyle,
              fontSize: 16,
              color: "#1f2937",
              marginBottom: 10,
            }}
          >
            What a Dividend Chaser Sees:
          </CustomTypography>
          <CustomTypography variant="body2" style={{ fontSize: 14, color: "#475569", lineHeight: 1.45 }}>
            &quot;Nice! I made $500 in dividends.&quot;
            <br />
            <br />
            &quot;That&apos;s a 5% yield. I&apos;ll keep collecting.&quot;
            <br />
            <br />
            <em>Ignores what the company is doing — or not doing — with retained capital.</em>
          </CustomTypography>
        </div>

        <div
          style={{
            backgroundColor: "#eef3ff",
            border: "1px solid #c7d7f5",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <CustomTypography
            variant="h5"
            style={{
              ...headingStyle,
              fontSize: 16,
              color: "#1a4b8f",
              marginBottom: 10,
            }}
          >
            What an Owner Sees:
          </CustomTypography>
          <CustomTypography variant="body2" style={{ fontSize: 14, color: "#1e3a8a", lineHeight: 1.45 }}>
            &quot;The company paid out everything. There&apos;s no reinvestment, no R&amp;D, no growth.&quot;
            <br />
            <br />
            &quot;Future earnings will likely stagnate or shrink due to inflation, competition, or disruption.&quot;
            <br />
            <br />
            &quot;I may get $500 this year — but five years from now, my ownership might be worth less.&quot;
          </CustomTypography>
        </div>
      </div>

      <Highlight>
        This is the dividend trap: the appearance of income while the underlying business slowly erodes.
        <br />
        <br />
        Owner thinking asks:
        <BulletList
          bulletColor="#bfa14a"
          listOverrides={{ marginTop: 18, marginBottom: 0 }}
          itemOverrides={{ marginBottom: 8 }}
          items={["Is my proportionate share of earnings growing?", "Is capital being deployed productively?"]}
        />
      </Highlight>

      <Body>
        Sometimes, a lower dividend with smart reinvestment leads to greater long-term wealth than a fat check today.
      </Body>

      {/* How Accounting Classifies Ownership */}
      <div style={sectionDivider} />
      <SectionTitle>How Accounting Classifies Ownership</SectionTitle>
      <Body>Traditional accounting separates investments by percentage of ownership:</Body>

      <div
        style={{
          backgroundColor: "#fafbfc",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          fontSize: 14,
          padding: 16,
          margin: "16px 0",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <table
          style={{
            width: "100%",
            fontSize: 14,
            borderCollapse: "collapse",
            fontFamily: "inherit",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #1a4b8f", background: "#f8fafc" }}>
              <th
                style={{
                  textAlign: "left",
                  fontSize: 14,
                  padding: "8px 6px",
                  fontWeight: 600,
                  color: "#1a1a1a",
                }}
                title="Ownership stake tier"
              >
                Ownership
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#1a1a1a",
                }}
                title="Accounting category"
              >
                Category
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1a1a1a",
                }}
                title="Recognition method"
              >
                Method
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1a1a1a",
                }}
                  title="Income recognition"
              >
                Recognition
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e1e5e9" }}>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>0–20%</td>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>Passive investment</td>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>Fair value or cost</td>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>
                Only dividends and price changes
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e1e5e9" }}>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>20–50%</td>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>Associate</td>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>Equity method</td>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>Your share of net income</td>
            </tr>
            <tr>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>&gt;50%</td>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>Subsidiary</td>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>Consolidation</td>
              <td style={{ padding: "8px 6px", fontSize: 14, color: "#444e5e" }}>
                100% of income (with NCI adjustments)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Body>
        Most retail investors hold shares in the 0–20% range — and are treated as passive investors. The interfaces
        they use emphasize market value and dividends. You see price changes and distributions, but not the economic
        engine underneath.
      </Body>
      <Body>
        Buffett&apos;s approach — and the one we build into <strong>The Stock Owner&apos;s Report</strong> —
        encourages investors to think like owners: even with a minority stake, you track your proportionate share of
        earnings as if you were sitting at the boardroom table.
      </Body>
      <Body>
        This shift in mindset changes everything:
        <BulletList
          bulletColor="#bfa14a"
          items={[
            "Instead of tracking stock prices, you track business performance.",
            "Instead of reacting to volatility, you assess value.",
          ]}
        />
        Whether you own 0.1% or 10%, your proportionate share of the business still exists — and it&apos;s earning
        (or losing) money for you.
      </Body>
      <Highlight>
        <strong>What is my real economic ownership, and what is it earning for me?</strong>
      </Highlight>

      {/* The Stock Owner’s Report: Financial Statements for Real Owners */}
      <div style={sectionDivider} />
      <SectionTitle>The Stock Owner&apos;s Report: Financial Statements for Real Owners</SectionTitle>

      <Highlight>
        <strong>Real-World Example (Illustrative)</strong>
      </Highlight>

      <Body>
        To bring this concept to life, here&apos;s how an owner-style income statement works inside The Stock
        Owner&apos;s Report:
      </Body>

      <ExampleBox>
        <Body>
          Each row represents a company in the user&apos;s portfolio. For each company, the report translates
          &quot;shares owned&quot; into a <strong>proportionate share</strong> of revenue, operating profit, net
          income, and cash flow.
          <br />
          <br />
          For example (illustrative):
          <BulletList
            bulletColor="#bfa14a"
            items={[
              "A small ownership stake in a mid-cap company can translate into hundreds or thousands of dollars of earnings exposure — even if the dividend is minimal.",
              "Across a portfolio, those earnings exposures aggregate into a single owner-style total: how much the businesses you own collectively earned on your behalf.",
            ]}
          />
        </Body>
        <Body>
          Even though your stakes may be tiny slivers of large companies, the platform aggregates your actual
          economic ownership — showing exactly how much of the companies&apos; earnings power you effectively own.
        </Body>
      </ExampleBox>

      <Body style={{ fontWeight: 500, fontSize: 16 }}>
        The point is simple: you can stop guessing what your portfolio might do — and start measuring what your
        businesses are actually producing for you as an owner.
      </Body>

      <Body>
        The Stock Owner&apos;s Report generates clear, owner-style statements that show you:
        <BulletList
          bulletColor="#bfa14a"
          items={[
            "Your proportionate share of each company&apos;s assets, liabilities, equity, income, and cash flow",
            "A breakdown of retained vs. distributed earnings",
            "Simple, readable owner-style financial statements — as if you owned a private stake in each company",
          ]}
        />
      </Body>

      <Body>
        It&apos;s like owning 5% of a laundromat, 2% of a trucking company, and 1% of a software business. You
        wouldn&apos;t determine the value of your laundromat stake based on someone&apos;s mood today. Yet many
        investors do exactly that with stocks: they anchor on what &quot;the market&quot; will pay today instead of
        what the business earns and can earn.
      </Body>

      <Body>
        Rational investing is economics, not mood. The value of any business is ultimately tied to the present value
        of the future cash it can generate. Proportionate share makes that real: it tells you what portion of those
        economics belongs to you.
      </Body>

      <Body>
        That&apos;s how a true owner thinks. Just like a business owner, you want to know:
        <BulletList
          bulletColor="#bfa14a"
          items={["How much are we earning?", "What did we reinvest this year — and what return did it earn?"]}
        />
        That&apos;s how real owners think. And that&apos;s what we deliver.
      </Body>

      {/* Why This Changes How You Evaluate Stocks */}
      <div style={sectionDivider} />
      <SectionTitle>Why This Changes How You Evaluate Stocks</SectionTitle>
      <Body>
        When you use proportionate-share earnings:
        <BulletList
          bulletColor="#bfa14a"
          items={[
            "You stop asking \"What&apos;s the stock price?\"",
            "And start asking: \"What is my proportionate share of the profits?\" \"Are those profits growing?\" \"Are they being reinvested wisely?\"",
          ]}
        />
        That&apos;s how business owners think. That&apos;s how Warren Buffett invests. That&apos;s how wealth is
        built.
      </Body>

      {/* Summary: How to Think Like Mr. Stock Owner */}
      <div style={sectionDivider} />
      <SectionTitle>Summary: How to Think Like Mr. Stock Owner</SectionTitle>

      <div
        style={{
          backgroundColor: "#fafbfc",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 16,
          fontSize: 14,
          margin: "16px 0",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
            fontFamily: "inherit",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #1a4b8f", background: "#f8fafc" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#1a1a1a",
                }}
                title="Key principle"
              >
                Principle
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  fontWeight: 600,
                  color: "#1a1a1a",
                }}
                title="Mr. Market mindset"
              >
                Mr. Market
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 6px",
                  fontWeight: 600,
                  color: "#1a1a1a",
                }}
                title="Mr. Stock Owner mindset"
              >
                Mr. Stock Owner
              </th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e1e5e9" }}>
              <td style={{ padding: "8px 6px", color: "#444e5e", fontWeight: 600 }}>Focus</td>
              <td style={{ padding: "8px 6px", color: "#444e5e" }}>Price &amp; sentiment</td>
              <td style={{ padding: "8px 6px", color: "#444e5e" }}>Profits &amp; intrinsic value</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e1e5e9" }}>
              <td style={{ padding: "8px 6px", color: "#444e5e", fontWeight: 600 }}>Measurement</td>
              <td style={{ padding: "8px 6px", color: "#444e5e" }}>Daily stock quote</td>
              <td style={{ padding: "8px 6px", color: "#444e5e" }}>Proportionate share of business earnings</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e1e5e9" }}>
              <td style={{ padding: "8px 6px", color: "#444e5e", fontWeight: 600 }}>Emotion</td>
              <td style={{ padding: "8px 6px", color: "#444e5e" }}>Fear and greed</td>
              <td style={{ padding: "8px 6px", color: "#444e5e" }}>Patience and rationality</td>
            </tr>
            <tr>
              <td style={{ padding: "8px 6px", color: "#444e5e", fontWeight: 600 }}>Goal</td>
              <td style={{ padding: "8px 6px", color: "#444e5e" }}>Quick trades and trends</td>
              <td style={{ padding: "8px 6px", color: "#444e5e" }}>Long-term wealth from ownership</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Highlight>
        <strong>Final Thought</strong>
        <br />
        <br />
        If you want to succeed in investing, don&apos;t trade stocks — buy businesses.
        <br />
        Forget the ticker. Ignore the headlines. Look through the financial statements — and into the business itself.
        <br />
        <br />
        Ask: &quot;What is my proportionate share of this business really earning?&quot; &quot;How much of it is
        working for me, every year?&quot;
        <br />
        <br />
        That&apos;s the power of proportionate share — and the mindset that separates speculators from true business
        owners.
      </Highlight>

      {/* Owner's Earnings Section */}
      <div style={sectionDivider} />
      <SectionTitle>Owner&apos;s Earnings: The Advanced Layer</SectionTitle>
      <Body>To go a step deeper, we need to address an important nuance:</Body>
      <Body>
        While &quot;earnings&quot; are useful, the true value of a business is not based on net income alone. In
        finance, valuation is grounded in:
      </Body>
      <Highlight>
        <strong>The present value of all future free cash flows.</strong>
      </Highlight>
      <Body>
        Cash — not accounting profit — is what matters to owners. But even cash must be considered after covering the
        costs needed to sustain the business.
      </Body>
      <Body>This brings us to owner&apos;s earnings, Buffett&apos;s preferred measure of real economic profit.</Body>

      <ExampleBox>
        <CustomTypography
          variant="h5"
          style={{
            ...headingStyle,
            fontSize: 18,
            color: "#bfa14a",
            marginBottom: 10,
          }}
        >
          Buffett&apos;s Definition:
        </CustomTypography>
        <CustomTypography variant="body2" style={{ fontSize: 14, color: "#444e5e", lineHeight: 1.45 }}>
          Owner&apos;s Earnings = Net Income + Depreciation &amp; Amortization +/– Non-cash or one-time adjustments –
          Maintenance Capital Expenditures
          <br />
          <br />
          Unlike traditional free cash flow, this focuses only on CapEx required to maintain current operations — not
          what&apos;s spent on expansion or acquisitions.
        </CustomTypography>
      </ExampleBox>

      <CustomTypography
        variant="h5"
        style={{
          ...headingStyle,
          fontSize: 22,
          color: "#bfa14a",
          marginBottom: 16,
        }}
      >
        Why Owner&apos;s Earnings Matter:
      </CustomTypography>
      <BulletList
        bulletColor="#bfa14a"
        items={[
          "They show how much cash the business could return to shareholders without shrinking.",
          "They strip out accounting distortions.",
          "They form the basis for intrinsic value estimation — what an intelligent buyer would pay today for the right to future cash flows.",
        ]}
      />

      <Body>
        If you expect a business to generate $2 million in owner&apos;s earnings annually, and discount those future
        earnings at a reasonable rate, you can estimate its present value — regardless of stock price.
      </Body>

      <Highlight>
        In short:
        <br />
        Speculators look at today&apos;s price.
        <br />
        <strong>Owners look at tomorrow&apos;s cash.</strong>
      </Highlight>

      <Body>
        There&apos;s a practical challenge: most 10-Ks and 10-Qs do not explicitly tell you how much capital
        expenditure is used for maintenance vs. growth. That makes it difficult to precisely calculate owner&apos;s
        earnings from public filings alone.
      </Body>

      <Body>
        To address this, The Stock Owner&apos;s Report uses a conservative industry-standard proxy: we assume
        depreciation approximates maintenance CapEx unless better disclosures are available. This method isn&apos;t
        perfect, but it provides a disciplined and consistent way to approximate the distributable cash that matters
        most to long-term owners.
      </Body>

      <Body
        style={{
          fontSize: 20,
          fontWeight: 600,
          textAlign: "center",
          marginTop: 48,
          marginBottom: 0,
          color: "#bfa14a",
        }}
      >
        And at The Stock Owner&apos;s Report, we help bring that clarity to every investor.
      </Body>
        </CustomBox>
      </CustomBox>
    </DashboardLayout>
  );
}

export default StockOwnersReportManual;
