import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSelectedMember } from "./QuickBooking";
import type { Comment } from "@shared/schema";
import { format } from "date-fns";
import { MessageCircle, Plus } from "lucide-react";

interface CommentsProps {
  date: string;
  variant?: 'popover' | 'sheet' | 'modal';
}

function CommentForm({ date, onSuccess }: { date: string; onSuccess?: () => void }) {
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedMemberId, selectedMember } = useSelectedMember();

  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!selectedMemberId || !selectedMember) {
        throw new Error("Please select a member");
      }

      return apiRequest("POST", "/api/comments", {
        memberId: selectedMemberId,
        memberName: selectedMember.name,
        date,
        comment: commentText,
      });
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/comments", date] });
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add comment",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addCommentMutation.mutate(comment.trim());
  }, [comment, addCommentMutation]);

  if (!selectedMemberId) {
    return <p className="text-sm text-gray-500 italic">Select a member to add comments</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment about this day..."
        className="text-sm min-h-[80px]"
        data-testid={`textarea-comment-${date}`}
        spellCheck={false}
        autoComplete="off"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={!comment.trim() || addCommentMutation.isPending}
          className="bg-blue-600 text-white hover:bg-blue-700"
          data-testid={`button-add-comment-${date}`}
        >
          {addCommentMutation.isPending ? "Adding..." : "Post Comment"}
        </Button>
      </div>
    </form>
  );
}

function CommentsDisplay({ date }: { date: string }) {
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/comments", date],
  });

  return (
    <div className="space-y-4">
      {comments.length > 0 ? (
        <div className="space-y-3" data-testid={`comments-list-${date}`}>
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-3 border" data-testid={`comment-${comment.id}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800">{comment.memberName}</span>
                <span className="text-xs text-gray-500">
                  {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{comment.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No comments yet for this day</p>
        </div>
      )}
    </div>
  );
}

export default function CommentsAlternative({ date, variant = 'popover' }: CommentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/comments", date],
  });

  const handleSuccess = () => {
    // Keep popover/sheet open after adding comment for better UX
  };

  // Option 1: Popover (compact overlay)
  if (variant === 'popover') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            data-testid={`button-comments-popover-${date}`}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Comments
            {comments.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {comments.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Comments</h4>
              <span className="text-xs text-gray-500">{format(new Date(date), "MMM d, yyyy")}</span>
            </div>
            <CommentsDisplay date={date} />
            <CommentForm date={date} onSuccess={handleSuccess} />
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Option 2: Sheet (slide-out panel)
  if (variant === 'sheet') {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            data-testid={`button-comments-sheet-${date}`}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Comments
            {comments.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {comments.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-96">
          <SheetHeader>
            <SheetTitle>Comments for {format(new Date(date), "MMMM d, yyyy")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <CommentsDisplay date={date} />
            <div className="border-t pt-4">
              <h5 className="text-sm font-medium mb-3">Add New Comment</h5>
              <CommentForm date={date} onSuccess={handleSuccess} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Fallback to popover
  return <CommentsAlternative date={date} variant="popover" />;
}