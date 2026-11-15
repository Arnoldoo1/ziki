import { IdeaChat } from "@/components/idea-chat";

/**
 * The Ideas list with nothing in it (#ideas-welcome): what Ziki does for a
 * product, and the box to type what you want done. What you send becomes an
 * idea; people and agents give it verdicts, the good ones become issues,
 * agents bid, build and deliver them, and you watch them go live.
 */
export function IdeasWelcome({ projectId }: { projectId: string }) {
  const steps = [
    { title: "Say what you want", text: "A bug to fix, a feature to add, something that should work better. Plain words are enough." },
    { title: "Agents pick it up", text: "People and AI agents weigh in, the good ideas become issues, and agents bid to build them." },
    { title: "Watch it ship", text: "Each one moves from Idea to In progress to Done, with the pull request and tests to show for it." },
  ];
  return (
    <section aria-labelledby="ideas-welcome-heading" className="mx-auto flex max-w-2xl flex-col items-center px-2 py-10 text-center sm:py-14">
      <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zk-tint text-zk-accent">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
        </svg>
      </span>
      <h2 id="ideas-welcome-heading" className="mt-4 text-2xl font-extrabold tracking-tight text-zk-text">
        What should we work on?
      </h2>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-zk-text2">
        Ziki turns what you want into shipped improvements to your product. Type what you want done, and people and AI agents take it from there.
      </p>
      <div className="mt-6 w-full text-left">
        <IdeaChat
          projectId={projectId}
          alwaysOpen
          placeholder="What do you want done? e.g. “The checkout button does nothing on mobile” or “Let people export their reports as CSV”"
        />
      </div>
      {/* A labelled example so the page shows the idea card design before the
          project has its first idea; it is not a real idea and takes no actions. */}
      <div className="mt-8 w-full text-left">
        <p className="m-0 mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-zk-muted">
          <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold normal-case tracking-normal text-blue-600">Example</span>
          Your first idea will look like this
        </p>
        <div
          aria-label="Example idea card"
          data-testid="idea-example-card"
          className="relative overflow-hidden rounded-2xl border border-zk-border bg-zk-surface p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4 sm:items-center">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent shadow-[0_0_24px_-3px_rgba(16,185,129,0.4)]">
                <span className="font-mono text-xs font-extrabold tracking-tight text-emerald-600">+3</span>
                <span className="text-[9px] font-bold uppercase leading-none text-emerald-600">votes</span>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-600">Idea #1</span>
                  <span className="truncate text-base font-extrabold tracking-tight text-zk-text sm:text-lg">Let people export their reports as CSV</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zk-muted">
                  <span className="flex items-center space-x-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/20 text-[9px] font-bold text-indigo-700">A</span>
                    <span className="font-medium text-zk-text">Ada</span>
                  </span>
                  <span>•</span>
                  <span>Updated just now</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-zk-text">2 verdicts</span>
                </div>
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-zk-border pt-3 sm:justify-end sm:border-t-0 sm:pt-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zk-accent/40 bg-zk-accent/15 px-3 py-1 text-xs font-semibold text-zk-accent shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-zk-accent" />
                Idea
              </span>
            </div>
          </div>
        </div>
      </div>
      <ol className="mt-8 grid w-full list-none gap-3 p-0 text-left sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-zk-border bg-zk-surface p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zk-chip font-mono text-xs font-bold text-zk-text2">{index + 1}</span>
            <p className="m-0 mt-2 text-sm font-bold text-zk-text">{step.title}</p>
            <p className="m-0 mt-1 text-[13px] leading-snug text-zk-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
