/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Admin panel placeholder with analytics overview and governance tooling.
// TODO: Wire analytics dashboards and AI-assisted insights for participation trends.

export default function AdminPanel() {
  const stats = [
    { label: 'Total Users', value: 812 },
    { label: 'Active Clubs', value: 28 },
    { label: 'Certificates Issued', value: 1342 },
    { label: 'Events This Month', value: 42 }
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-accent">Admin Panel</h2>
          <p className="text-sm text-slate-500">
            Manage clubs, roles, and get a snapshot of school-wide participation.
          </p>
        </div>
        <button className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition duration-250 hover:bg-brand-dark">
          Add new club
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-slate-200 bg-white/95 p-6 text-center shadow-soft transition duration-250 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
            <p className="mt-3 text-2xl font-semibold text-accent">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-800">Role Assignments</h3>
          <p className="mt-2 text-sm text-slate-500">
            Interface for assigning Boy-in-Charge and Master-in-Charge roles will appear here.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-800">Participation Analytics</h3>
          <p className="mt-2 text-sm text-slate-500">
            Charts for house-wise and monthly participation will be embedded here.
          </p>
        </div>
      </section>
    </div>
  );
}
