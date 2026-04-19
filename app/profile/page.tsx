import { getCurrentUserSession } from "@/lib/server/session";

export default async function ProfilePage() {
  const auth = await getCurrentUserSession();
  const user = auth.user;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e6f4f1] via-[#edf3ff] to-[#f3e9ff] px-6 py-16 text-gray-800">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-600">
          Profile
        </p>
        <h1 className="mt-4 text-4xl font-black text-gray-900">
          {user ? user.name : "Guest profile"}
        </h1>
        <div className="mt-8 space-y-4 rounded-2xl bg-slate-50 p-6 text-sm text-slate-700">
          {user ? (
            <>
              <p>Email: {user.email}</p>
              <p>Account created: {user.createdAt.toLocaleDateString()}</p>
              <p>Cloud account id: {user._id.toString()}</p>
            </>
          ) : (
            <p>Guest mode is active. Log in or sign up to enable cloud profile storage.</p>
          )}
        </div>
      </section>
    </main>
  );
}
