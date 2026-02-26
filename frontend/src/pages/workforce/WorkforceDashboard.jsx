import useWorkforceStore from "../../store/workforceStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function WorkforceDashboard() {
  const analysis = useWorkforceStore((s) => s.analysis);

  if (!analysis)
    return <div className="p-8">No analysis data available.</div>;

  const chartData = [
    { name: "Skill Score", value: analysis.skill_score },
    { name: "Leadership", value: analysis.leadership_score },
    { name: "Promotion", value: analysis.promotion_readiness },
  ];

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">
        Workforce Intelligence Dashboard
      </h2>

      <BarChart width={500} height={300} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Bar dataKey="value" fill="#2563EB" />
      </BarChart>

      <div className="mt-8">
        <h3 className="font-bold">Employee:</h3>
        <p>{analysis.employee_name}</p>

        <h3 className="font-bold mt-4">Recommended Role:</h3>
        <p>{analysis.recommended_role}</p>

        <h3 className="font-bold mt-4">Training Recommendations:</h3>
        <ul className="list-disc ml-5">
          {analysis.training_recommendations.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
