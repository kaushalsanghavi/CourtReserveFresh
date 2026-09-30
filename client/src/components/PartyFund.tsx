import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { ClockIcon } from "@phosphor-icons/react/dist/csr/Clock";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { CurrencyInrIcon } from "@phosphor-icons/react/dist/csr/CurrencyInr";
import { EqualizerIcon } from "@phosphor-icons/react/dist/csr/Equalizer";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import type { Fine, FineEvent, FineReason, Member } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSelectedMember } from "@/components/QuickBooking";
import { DeviceInfo } from "@/components/ActivityMetadata";

type FineFilter = "all" | "due" | "paid";
type FundView = "fines" | "history";

const avatarColors: Record<string, string> = {
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  yellow: "bg-yellow-100 text-yellow-700",
  pink: "bg-pink-100 text-pink-700",
  indigo: "bg-indigo-100 text-indigo-700",
  teal: "bg-teal-100 text-teal-700",
};

const fineLabels: Record<FineReason, string> = {
  late: "Came late",
  "no-show": "No-show",
};

interface ReportingWindow {
  date: string;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Request failed");
  }
  return payload as T;
}

export default function PartyFund() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedMemberId, setSelectedMemberId } = useSelectedMember();
  const { data: fetchedMembers = [] } = useQuery<Member[]>({ queryKey: ["/api/members?status=active"] });
  const members = fetchedMembers;
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(now, "yyyy-MM"));
  const [filter, setFilter] = useState<FineFilter>("all");
  const [fundView, setFundView] = useState<FundView>("fines");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fineToRemove, setFineToRemove] = useState<Fine | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [memberId, setMemberId] = useState("");
  const [reason, setReason] = useState<FineReason>("late");
  const [note, setNote] = useState("");

  const { data: reportingWindow, isLoading: isWindowLoading } = useQuery<ReportingWindow>({
    queryKey: ["/api/fines/reporting-window"],
    staleTime: 0,
    refetchInterval: 15_000,
  });
  const { data: fines = [], isLoading: finesLoading } = useQuery<Fine[]>({
    queryKey: ["/api/fines", selectedMonth],
    queryFn: () => fetchJson(`/api/fines?month=${selectedMonth}`),
  });
  const { data: history = [], isLoading: historyLoading } = useQuery<FineEvent[]>({
    queryKey: ["/api/fines/history", selectedMonth],
    queryFn: () => fetchJson(`/api/fines/history?month=${selectedMonth}`),
  });

  const monthOptions = useMemo(
    () => Array.from({ length: 6 }, (_, index) => subMonths(startOfMonth(now), index)),
    [],
  );

  const visibleFines = fines.filter((fine) => {
    if (filter === "due") return fine.status === "due";
    if (filter === "paid") return fine.status === "paid";
    return true;
  });
  const total = fines.reduce((sum, fine) => sum + fine.amount, 0);
  const collected = fines.filter((fine) => fine.status === "paid").reduce((sum, fine) => sum + fine.amount, 0);
  const due = total - collected;
  const peopleDue = new Set(fines.filter((fine) => fine.status === "due").map((fine) => fine.memberName)).size;
  const monthDate = parseISO(`${selectedMonth}-01`);

  const resetForm = () => {
    setMemberId("");
    setReason("late");
    setNote("");
  };

  const refreshFineData = async (incidentDate?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/fines"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/fines/history"] }),
      incidentDate
        ? queryClient.invalidateQueries({ queryKey: ["/api/fines/history/date", incidentDate] })
        : Promise.resolve(),
    ]);
  };

  const reportMutation = useMutation({
    mutationFn: (input: { memberId: string; actorMemberId: string; reason: FineReason; note?: string }) =>
      fetchJson<Fine>("/api/fines", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: async (fine) => {
      setSelectedMonth(fine.incidentDate.slice(0, 7));
      setFilter("all");
      setDialogOpen(false);
      resetForm();
      await refreshFineData(fine.incidentDate);
      toast({ title: `₹${fine.amount} added to the party fund`, description: `${fine.memberName} has a friendly reminder waiting.` });
    },
    onError: (error: Error) => toast({ title: "Fine not reported", description: error.message, variant: "destructive" }),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ fine, actorMemberId }: { fine: Fine; actorMemberId: string }) =>
      fetchJson<Fine>(`/api/fines/${fine.id}/pay`, { method: "POST", body: JSON.stringify({ actorMemberId }) }),
    onSuccess: async (fine) => {
      await refreshFineData(fine.incidentDate);
      toast({ title: "Contribution collected", description: `${fine.memberName} added ₹${fine.amount} to party happiness.` });
    },
    onError: (error: Error) => toast({ title: "Payment not recorded", description: error.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: ({ fine, actorMemberId, reason }: { fine: Fine; actorMemberId: string; reason: string }) =>
      fetchJson<Fine>(`/api/fines/${fine.id}/remove`, { method: "POST", body: JSON.stringify({ actorMemberId, reason }) }),
    onSuccess: async (fine) => {
      setFineToRemove(null);
      setRemovalReason("");
      await refreshFineData(fine.incidentDate);
      toast({ title: "Fine removed", description: "The change is preserved in History." });
    },
    onError: (error: Error) => toast({ title: "Fine not removed", description: error.message, variant: "destructive" }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!memberId || !selectedMemberId) return;
    reportMutation.mutate({ memberId, actorMemberId: selectedMemberId, reason, note: note.trim() || undefined });
  };

  const markPaid = (fine: Fine) => {
    if (!selectedMemberId) return;
    paymentMutation.mutate({ fine, actorMemberId: selectedMemberId });
  };

  const removeFine = (event: FormEvent) => {
    event.preventDefault();
    if (!fineToRemove || !selectedMemberId || !removalReason.trim()) return;
    removeMutation.mutate({ fine: fineToRemove, actorMemberId: selectedMemberId, reason: removalReason.trim() });
  };

  const findMember = (id: string) => members.find((member) => member.id === id);

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" data-testid="party-fund">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="max-w-2xl">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg font-medium text-gray-900">Party Fund</h2>
              <EqualizerIcon className="h-[18px] w-[18px] text-amber-500" weight="duotone" aria-hidden="true" />
            </div>
            <p className="text-sm leading-6 text-gray-600">
              Hey, listen, you came late. Fine's due. Every rupee goes toward making the month-end party happen.
            </p>
          </div>
          <div className="sm:text-right">
            <Button className="w-full bg-green-600 hover:bg-green-700 sm:w-auto" onClick={() => setDialogOpen(true)} disabled={isWindowLoading || !reportingWindow?.isOpen} data-testid="report-fine-button">
              <PlusIcon weight="bold" aria-hidden="true" />
              Report a fine
            </Button>
            {!isWindowLoading && !reportingWindow?.isOpen && <p className="mt-1.5 text-xs text-gray-500">Reporting is open from 8:20 AM through 10:00 AM IST.</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-gray-200 md:grid-cols-4">
          <SummaryItem label="This month's pot" value={total.toString()} icon={<CurrencyInrIcon weight="bold" />} />
          <SummaryItem label="Collected" value={`₹${collected}`} tone="green" />
          <SummaryItem label="Still due" value={`₹${due}`} tone="amber" />
          <SummaryItem label="Friendly reminders" value={peopleDue.toString()} />
        </div>

        <div className="flex border-b border-gray-200 px-5 sm:px-6" aria-label="Party fund view">
          <button type="button" className={`mr-6 flex min-h-11 items-center gap-2 border-b-2 text-sm font-medium ${fundView === "fines" ? "border-green-600 text-green-700" : "border-transparent text-gray-500"}`} onClick={() => setFundView("fines")}>Fines</button>
          <button type="button" className={`flex min-h-11 items-center gap-2 border-b-2 text-sm font-medium ${fundView === "history" ? "border-green-600 text-green-700" : "border-transparent text-gray-500"}`} onClick={() => setFundView("history")}><ClockCounterClockwiseIcon className="h-4 w-4" weight={fundView === "history" ? "bold" : "regular"} /> History</button>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{format(monthDate, "MMMM yyyy")}</h3>
            <p className="text-xs text-gray-500">{fundView === "fines" ? `${fines.length} reported ${fines.length === 1 ? "fine" : "fines"}` : `${history.length} recorded ${history.length === 1 ? "change" : "changes"}`}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {fundView === "fines" && <div className="flex h-9 rounded-md border border-gray-200 bg-gray-50 p-0.5" aria-label="Filter fines">
              {(["all", "due", "paid"] as FineFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`min-w-16 rounded px-3 text-xs font-medium capitalize transition-colors ${filter === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  onClick={() => setFilter(value)}
                >
                  {value}
                </button>
              ))}
            </div>}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 w-full sm:w-40" data-testid="party-fund-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={format(month, "yyyy-MM")} value={format(month, "yyyy-MM")}>{format(month, "MMMM yyyy")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(fundView === "fines" ? finesLoading : historyLoading) ? (
          <div className="space-y-3 px-6 py-8" data-testid="party-fund-loading">
            <div className="h-12 animate-pulse rounded bg-gray-100" />
            <div className="h-12 animate-pulse rounded bg-gray-100" />
          </div>
        ) : fundView === "fines" && visibleFines.length > 0 ? (
          <div>
            <div className="hidden grid-cols-[minmax(180px,1.2fr)_140px_minmax(160px,1fr)_120px_110px] gap-4 border-b border-gray-100 px-6 py-3 text-xs font-medium uppercase text-gray-500 md:grid">
              <span>Member</span><span>Fine</span><span>Reported by</span><span>Status</span><span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-gray-100">
              {visibleFines.map((fine) => {
                const member = findMember(fine.memberId);
                return (
                  <div key={fine.id} className="px-5 py-4 sm:px-6" data-testid={`fine-row-${fine.id}`}>
                    <div className="grid gap-3 md:grid-cols-[minmax(180px,1.2fr)_140px_minmax(160px,1fr)_120px_110px] md:items-center md:gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColors[member?.avatarColor || ""] || "bg-gray-100 text-gray-700"}`}>
                          {member?.initials || fine.memberName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{fine.memberName}</p>
                          <p className="text-xs text-gray-500">{format(parseISO(fine.incidentDate), "d MMM")}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:block">
                        <span className="text-xs text-gray-500 md:hidden">Fine</span>
                        <div className="text-right md:text-left">
                          <p className="text-sm font-medium text-gray-900">₹{fine.amount}</p>
                          <p className="text-xs text-gray-500">{fineLabels[fine.reason]}</p>
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-4 md:block">
                        <span className="shrink-0 text-xs text-gray-500 md:hidden">Reported by</span>
                        <div className="text-right md:text-left">
                          <p className="text-sm text-gray-700">{fine.reporterName}</p>
                          {fine.reportNote && <p className="mt-0.5 line-clamp-1 text-xs text-gray-500" title={fine.reportNote}>{fine.reportNote}</p>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:block">
                        <span className="text-xs text-gray-500 md:hidden">Status</span>
                        {fine.status === "paid" ? (
                          <Badge className="border-green-200 bg-green-50 font-medium text-green-700 hover:bg-green-50">Contributed</Badge>
                        ) : (
                          <Badge className="border-amber-200 bg-amber-50 font-medium text-amber-700 hover:bg-amber-50">Fine's due</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        {fine.status === "paid" ? (
                          <span className="inline-flex h-9 items-center gap-1.5 text-xs font-medium text-green-700"><CheckIcon className="h-4 w-4" weight="bold" /> All good</span>
                        ) : (
                          <Button variant="outline" size="sm" className="w-full text-xs md:w-auto" onClick={() => markPaid(fine)} disabled={!selectedMemberId || paymentMutation.isPending}>Mark paid</Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Remove misreported fine" aria-label={`Remove fine for ${fine.memberName}`} onClick={() => setFineToRemove(fine)}><TrashIcon className="h-4 w-4" weight="bold" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : fundView === "fines" ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-gray-900">No fines here</p>
            <p className="mt-1 text-sm text-gray-500">Either everyone behaved, or nobody is reporting properly.</p>
          </div>
        ) : history.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {history.map((event) => (
              <div key={event.id} className="flex gap-3 px-5 py-4 sm:px-6">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${event.action === "reported" ? "bg-blue-50 text-blue-600" : event.action === "paid" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  {event.action === "reported" ? <PlusIcon className="h-4 w-4" weight="bold" /> : event.action === "paid" ? <CheckIcon className="h-4 w-4" weight="bold" /> : <TrashIcon className="h-4 w-4" weight="bold" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{event.actorName}</span>{" "}
                      {event.action === "reported" ? "reported" : event.action === "paid" ? "marked as paid" : "removed"}{" "}
                      <span className="font-medium">{event.subjectMemberName}'s ₹{event.amount} fine</span>
                    </p>
                    <time className="shrink-0 text-xs text-gray-400">{format(new Date(event.createdAt), "d MMM, h:mm a")}</time>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{fineLabels[event.reason]} on {format(parseISO(event.incidentDate), "d MMM")}{event.note ? ` · ${event.note}` : ""}</p>
                  <DeviceInfo className="mt-1 text-xs text-gray-400" deviceInfo={event.deviceInfo} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-14 text-center"><p className="text-sm font-medium text-gray-900">No history for this month</p><p className="mt-1 text-sm text-gray-500">Fine reports and changes will appear here.</p></div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report a fine</DialogTitle>
            <DialogDescription>Keep it light. This is a nudge for the group and a boost for the party fund.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3 rounded-md border border-green-200 bg-green-50 px-3 py-3">
              <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-700" weight="bold" />
              <div><p className="text-sm font-medium text-green-900">Today's reporting window</p><p className="mt-0.5 text-xs text-green-700">8:20 AM-10:00 AM · Booking date is locked to {reportingWindow ? format(parseISO(reportingWindow.date), "d MMMM") : "today"}.</p></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fined-member">Who owes the party fund?</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger id="fined-member" data-testid="fined-member-select"><SelectValue placeholder="Choose a member" /></SelectTrigger>
                <SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>What happened?</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={`rounded-md border p-3 text-left transition-colors ${reason === "late" ? "border-green-600 bg-green-50 ring-1 ring-green-600" : "border-gray-200 hover:border-gray-300"}`} onClick={() => setReason("late")}>
                  <span className="block text-sm font-medium text-gray-900">Came late</span><span className="mt-1 block text-xs text-gray-500">₹50</span>
                </button>
                <button type="button" className={`rounded-md border p-3 text-left transition-colors ${reason === "no-show" ? "border-green-600 bg-green-50 ring-1 ring-green-600" : "border-gray-200 hover:border-gray-300"}`} onClick={() => setReason("no-show")}>
                  <span className="block text-sm font-medium text-gray-900">No-show</span><span className="mt-1 block text-xs text-gray-500">₹100</span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="reported-by">Reported by</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger id="reported-by" data-testid="reported-by-select"><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="fine-note">Add a note <span className="font-normal text-gray-400">(optional)</span></Label><Textarea id="fine-note" className="min-h-20 resize-none" value={note} onChange={(event) => setNote(event.target.value)} placeholder="A little context, no courtroom drama" maxLength={120} /></div>
            <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm"><span className="text-gray-600">Fine amount</span><span className="font-semibold text-gray-900">₹{reason === "late" ? 50 : 100}</span></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={!memberId || !selectedMemberId || !reportingWindow?.isOpen || reportMutation.isPending}>{reportMutation.isPending ? "Adding..." : "Add to party fund"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fineToRemove} onOpenChange={(open) => !open && setFineToRemove(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader><DialogTitle>Remove this fine?</DialogTitle><DialogDescription>It will leave the active ledger, but the original report and this removal will stay visible in History.</DialogDescription></DialogHeader>
          <form onSubmit={removeFine} className="space-y-4">
            {fineToRemove && <div className="rounded-md bg-gray-50 px-3 py-3 text-sm"><span className="font-medium text-gray-900">{fineToRemove.memberName}</span><span className="text-gray-500"> · {fineLabels[fineToRemove.reason]} · ₹{fineToRemove.amount}</span></div>}
            <div className="space-y-2"><Label htmlFor="removed-by">Removed by</Label><Select value={selectedMemberId} onValueChange={setSelectedMemberId}><SelectTrigger id="removed-by" data-testid="removed-by-select"><SelectValue placeholder="Choose a member" /></SelectTrigger><SelectContent>{members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="removal-reason">Why is it being removed?</Label><Textarea id="removal-reason" className="min-h-20 resize-none" value={removalReason} onChange={(event) => setRemovalReason(event.target.value)} placeholder="For example: wrong member selected" maxLength={120} required /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setFineToRemove(null)}>Keep fine</Button><Button type="submit" variant="destructive" disabled={!selectedMemberId || !removalReason.trim() || removeMutation.isPending}>{removeMutation.isPending ? "Removing..." : "Remove fine"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryItem({ label, value, tone, icon }: { label: string; value: string; tone?: "green" | "amber"; icon?: React.ReactNode }) {
  const valueColor = tone === "green" ? "text-green-700" : tone === "amber" ? "text-amber-700" : "text-gray-900";
  return (
    <div className="border-b border-r border-gray-100 px-5 py-4 last:border-r-0 md:border-b-0 md:px-6">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className={`mt-1 flex items-center gap-1 text-xl font-semibold ${valueColor}`}>{icon && <span className="[&_svg]:h-4 [&_svg]:w-4">{icon}</span>}{value}</div>
    </div>
  );
}
