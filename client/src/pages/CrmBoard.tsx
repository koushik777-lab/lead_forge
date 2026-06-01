import { useGetCrmPipeline, useUpdateLeadStage, getGetCrmPipelineQueryKey } from "@/lib/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import ScoreBadge from "@/components/ScoreBadge";
import { Globe2, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CrmStage } from "@/lib/api";

const STAGE_COLORS: Record<string, string> = {
  "New Lead": "border-t-blue-500",
  "Contacted": "border-t-indigo-500",
  "Qualified": "border-t-amber-500",
  "Proposal Sent": "border-t-purple-500",
  "Closed Won": "border-t-green-500",
  "Closed Lost": "border-t-red-500",
};

const STAGE_COUNT_COLORS: Record<string, string> = {
  "New Lead": "bg-blue-500/10 text-blue-400",
  "Contacted": "bg-indigo-500/10 text-indigo-400",
  "Qualified": "bg-amber-500/10 text-amber-400",
  "Proposal Sent": "bg-purple-500/10 text-purple-400",
  "Closed Won": "bg-green-500/10 text-green-400",
  "Closed Lost": "bg-red-500/10 text-red-400",
};

const CRM_STAGES: CrmStage[] = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Closed Won", "Closed Lost"];

export default function CrmBoard() {
  const { data, isLoading } = useGetCrmPipeline();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateStage = useUpdateLeadStage();

  const stages = data?.stages ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <h1 className="text-xl font-semibold text-foreground">CRM Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your deals across stages</p>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        {isLoading ? (
          <div className="flex gap-4 h-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-60 flex-shrink-0 bg-card border border-card-border rounded-lg animate-pulse h-48" />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 h-full min-h-0">
            {stages.map((stageData) => (
              <div
                key={stageData.stage}
                className={`w-60 flex-shrink-0 bg-card border border-card-border rounded-lg border-t-2 ${STAGE_COLORS[stageData.stage] ?? "border-t-muted"} flex flex-col`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border flex-shrink-0">
                  <h3 className="text-xs font-semibold text-foreground truncate">{stageData.stage}</h3>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STAGE_COUNT_COLORS[stageData.stage] ?? "bg-muted text-muted-foreground"}`}>
                    {stageData.leads.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {stageData.leads.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-md">
                      No leads
                    </div>
                  ) : (
                    stageData.leads.map((lead) => (
                      <div key={lead.id} className="bg-background border border-border rounded-md p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/leads/${lead.id}`} className="text-xs font-medium text-foreground hover:text-primary transition-colors leading-tight">
                            {lead.businessName}
                          </Link>
                          <ScoreBadge category={lead.scoreCategory} className="flex-shrink-0" />
                        </div>

                        {lead.industry && (
                          <p className="text-xs text-muted-foreground">{lead.industry}</p>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground">
                          {lead.noWebsite && (
                            <span title="No Website">
                              <Globe2 className="w-3 h-3 text-amber-400" />
                            </span>
                          )}
                          {lead.email && <Mail className="w-3 h-3" />}
                          {lead.phone && <Phone className="w-3 h-3" />}
                        </div>

                        {/* Quick stage change */}
                        <select
                          value={stageData.stage}
                          onChange={(e) => {
                            updateStage.mutate(
                              { leadId: lead.id, stage: e.target.value as CrmStage },
                              {
                                onSuccess: () => {
                                  queryClient.invalidateQueries({ queryKey: getGetCrmPipelineQueryKey() });
                                  toast({ title: "Lead moved" });
                                },
                              }
                            );
                          }}
                          className="w-full text-xs px-1.5 py-1 bg-muted border border-border rounded text-muted-foreground focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {CRM_STAGES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
