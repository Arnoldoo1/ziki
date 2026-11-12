import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { SecuritySeverity } from "@prisma/client";
import { CHECK_STATUS_LABEL, FINISHED_CHECK_STATUSES, TARGET_KIND_LABEL } from "@/lib/security-checks";
import type { CheckReport, SeverityCounts } from "@/lib/security-checks/report";
import { SECURITY_SEVERITIES, SEVERITY_LABEL } from "@/lib/security-severity";

/**
 * The downloadable security report (#security-checks, part 4). It prints
 * exactly what `loadCheckReport` handed over, so an unpaid check's PDF holds
 * the same teaser as the page and nothing more.
 */

/** Printed colours, matching the severity chips' light palette. */
const SEVERITY_COLOUR: Record<SecuritySeverity, string> = {
  critical: "#b91c1c",
  high: "#c2410c",
  medium: "#b45309",
  low: "#475569",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111827", lineHeight: 1.45 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 10 },
  meta: { marginTop: 3, color: "#4b5563" },
  section: { marginTop: 18 },
  heading: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  problem: { marginBottom: 10, padding: 10, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 6 },
  severity: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  problemTitle: { marginTop: 2, fontSize: 11, fontFamily: "Helvetica-Bold" },
  body: { marginTop: 3 },
  fixLabel: { marginTop: 6, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#4b5563" },
  locked: { marginTop: 6, color: "#4b5563" },
  pay: { marginTop: 4, padding: 10, backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fcd34d", borderRadius: 6 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: "#6b7280" },
});

/** Problem text is written in Markdown; the PDF prints it as plain text. */
function plain(text: string): string {
  return text.replace(/\*\*|__|`/g, "");
}

function countsText(counts: SeverityCounts): string {
  return SECURITY_SEVERITIES.filter((level) => counts[level] > 0)
    .map((level) => `${counts[level]} ${SEVERITY_LABEL[level].toLowerCase()}`)
    .join(" · ");
}

function Problem({ severity, title, description, howToFix }: { severity: SecuritySeverity; title: string; description: string; howToFix?: string }) {
  return (
    <View style={styles.problem} wrap={false}>
      <Text style={[styles.severity, { color: SEVERITY_COLOUR[severity] }]}>{SEVERITY_LABEL[severity]}</Text>
      <Text style={styles.problemTitle}>{plain(title)}</Text>
      <Text style={styles.body}>{plain(description)}</Text>
      {howToFix === undefined ? (
        <Text style={styles.locked}>How to fix it is in the full report.</Text>
      ) : (
        <>
          <Text style={styles.fixLabel}>How to fix</Text>
          <Text style={styles.body}>{plain(howToFix)}</Text>
        </>
      )}
    </View>
  );
}

function ReportDocument({ report, generatedAt }: { report: CheckReport; generatedAt: Date }) {
  const still = !FINISHED_CHECK_STATUSES.has(report.status);
  const kind = TARGET_KIND_LABEL[report.target.kind];
  return (
    <Document title={`Security report: ${report.target.input}`} author="Ziki">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Security report</Text>
        <Text style={styles.meta}>{kind}: {report.target.input}</Text>
        <Text style={styles.meta}>
          {CHECK_STATUS_LABEL[report.status]} · {report.progress.done} of {report.progress.total} parts checked · Made{" "}
          {generatedAt.toISOString().slice(0, 10)}
        </Text>

        <View style={styles.section}>
          <Text style={styles.heading}>
            {report.total === 0
              ? still ? "Nothing found yet" : "No problems found"
              : `${report.total} ${report.total === 1 ? "problem" : "problems"} found${still ? " so far" : ""}: ${countsText(report.counts)}`}
          </Text>

          {report.paid
            ? report.results.map((result) => (
                <Problem key={result.id} severity={result.severity} title={result.title} description={result.description} howToFix={result.howToFix} />
              ))
            : (
                <>
                  {report.teaser ? (
                    <Problem severity={report.teaser.severity} title={report.teaser.title} description={report.teaser.description} />
                  ) : null}
                  {report.total > 0 ? (
                    <View style={styles.pay}>
                      <Text>
                        {report.hiddenCount > 0
                          ? `${report.hiddenCount} more ${report.hiddenCount === 1 ? "problem" : "problems"} found${still ? " so far" : ""}.`
                          : `No other problems found${still ? " so far" : ""}.`}{" "}
                        Pay {report.priceCoins} coins on Ziki to see all, with how to fix each one.
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
        </View>

        <Text style={styles.footer} fixed>
          Private to your Ziki workspace. Agents looked for weaknesses; they did not exploit them.
        </Text>
      </Page>
    </Document>
  );
}

export function renderReportPdf(report: CheckReport): Promise<Buffer> {
  return renderToBuffer(<ReportDocument report={report} generatedAt={new Date()} />);
}
