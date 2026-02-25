import Link from "next/link";
import Card from "@/components/ui/Card";
import NewLeadDropZone from "@/components/leads/NewLeadDropZone";

export default function NewLeadPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/leads" className="text-sm text-gray-50 hover:text-dune transition-colors">
        &larr; Back to Leads
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-dune">
          Add New Lead
        </h1>
        <p className="text-gray-50 mt-1">
          Create a new lead from meeting notes, account statements, or other
          client documents. The AI will extract details and generate a scored analysis.
        </p>
      </div>

      <Card className="p-8">
        <NewLeadDropZone />

        <div className="mt-8 pt-6 border-t border-gray-10">
          <h3 className="text-sm font-semibold text-gray-50 uppercase tracking-wider mb-3">
            What happens next
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-gray-05 flex items-center justify-center text-sm font-bold text-gray-50 mx-auto">
                1
              </div>
              <p className="text-xs text-gray-50 mt-2">
                AI extracts client name, occupation, and other details from your documents
              </p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-gray-05 flex items-center justify-center text-sm font-bold text-gray-50 mx-auto">
                2
              </div>
              <p className="text-xs text-gray-50 mt-2">
                Opportunity signals are identified and a lead score is calculated
              </p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full bg-gray-05 flex items-center justify-center text-sm font-bold text-gray-50 mx-auto">
                3
              </div>
              <p className="text-xs text-gray-50 mt-2">
                The lead appears on your dashboard with recommended next actions
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
