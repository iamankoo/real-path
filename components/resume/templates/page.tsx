"use client";

import { useRouter } from "next/navigation";

export default function TemplatesPage() {

  const router = useRouter();

  const templates = [
    {
      id: "modern",
      name: "Modern",
      color: "from-indigo-500 to-purple-500"
    },
    {
      id: "professional",
      name: "Professional",
      color: "from-gray-700 to-gray-900"
    },
    {
      id: "minimal",
      name: "Minimal",
      color: "from-green-400 to-teal-500"
    }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-24 px-6">

      <h1 className="text-5xl font-bold text-center mb-16">
        Choose Your Resume Template
      </h1>

      <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">

        {templates.map((t)=>(
          <div
            key={t.id}
            className="bg-white rounded-3xl shadow-xl overflow-hidden hover:scale-105 hover:shadow-2xl transition cursor-pointer"
            onClick={()=>router.push(`/builder?template=${t.id}`)}
          >

            {/* Template Preview */}
            <div className={`h-72 bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xl font-bold`}>
              {t.name} Template
            </div>

            {/* Footer */}
            <div className="p-6 text-center">

              <h3 className="text-lg font-semibold mb-3">
                {t.name}
              </h3>

              <button
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Use Template
              </button>

            </div>

          </div>
        ))}

      </div>

    </main>
  );
}