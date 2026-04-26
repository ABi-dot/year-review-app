import { ItemType, ITEM_TYPE_LABELS } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Film, Tv, Gamepad2, Star } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  BOOK: <BookOpen className="w-4 h-4" />,
  MOVIE: <Film className="w-4 h-4" />,
  TV: <Tv className="w-4 h-4" />,
  GAME: <Gamepad2 className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  BOOK: "bg-[#FFB347]/20 text-[#E67E22] border-[#FFB347]/40",
  MOVIE: "bg-[#FF6B9D]/20 text-[#E05588] border-[#FF6B9D]/40",
  TV: "bg-[#C084FC]/20 text-[#9B59B6] border-[#C084FC]/40",
  GAME: "bg-[#4ADE80]/20 text-[#27AE60] border-[#4ADE80]/40",
};

interface RecommendItem {
  title: string;
  type: string;
  creator?: string;
  year?: string;
  cover?: string;
  reason: string;
}

export default function AIRecommendCard({ item }: { item: RecommendItem }) {
  const type = item.type as ItemType;
  const label = ITEM_TYPE_LABELS[type] ?? item.type;

  return (
    <Card className="border-2 border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {item.cover && (
            <div className="w-24 h-36 flex-shrink-0 overflow-hidden bg-muted shadow-sm">
              <img
                key={item.cover}
                src={
                  item.cover.includes("doubanio.com")
                    ? `/api/proxy/image?url=${encodeURIComponent(item.cover)}`
                    : item.cover
                }
                alt={item.title}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-lg leading-snug">{item.title}</h4>
                <Badge
                  variant="outline"
                  className={
                    (TYPE_COLORS[type] ?? "bg-muted text-muted-foreground") +
                    " flex-shrink-0 rounded-full text-[10px]"
                  }
                >
                  {TYPE_ICONS[type]}
                  <span className="ml-1">{label}</span>
                </Badge>
              </div>
              {item.creator && (
                <p className="text-sm text-muted-foreground">{item.creator}</p>
              )}
            </div>

            <p className="text-sm text-primary font-medium leading-relaxed">
              {item.reason}
            </p>

            {item.year && (
              <p className="text-xs text-muted-foreground">{item.year}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
