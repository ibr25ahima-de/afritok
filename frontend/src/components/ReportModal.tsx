import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { X, AlertCircle } from "lucide-react";

interface ReportModalProps {
  videoId?: number;
  userId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportModal({ videoId, userId, isOpen, onClose }: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const reportMutation = trpc.report.create.useMutation();

  const handleSubmitReport = async () => {
    if (!reason) {
      alert("Please select a reason");
      return;
    }

    await reportMutation.mutateAsync({
      videoId,
      userId,
      reason,
      description,
    });

    alert("Report submitted successfully. Our team will review it shortly.");
    setReason("");
    setDescription("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 border border-purple-800/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h2 className="text-white font-semibold text-lg">Report Content</h2>
          </div>
          <button
            onClick={onClose}
            className="text-purple-400 hover:text-purple-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-purple-300 font-semibold mb-2">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-600"
            >
              <option value="">Select a reason...</option>
              <option value="Inappropriate Content">Inappropriate Content</option>
              <option value="Harassment">Harassment</option>
              <option value="Spam">Spam</option>
              <option value="Copyright Infringement">Copyright Infringement</option>
              <option value="Misinformation">Misinformation</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-purple-300 font-semibold mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about your report..."
              rows={4}
              className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="bg-slate-800/50 border border-purple-800/30 rounded-lg p-3">
            <p className="text-sm text-purple-300">
              Your report is confidential and will be reviewed by our moderation team. Thank you for helping keep Afritok safe.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 text-white border-purple-800/50 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={!reason || reportMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {reportMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
