import * as React from "react";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { formatINR } from "@/lib/currency";

export type LabelItem = {
  sku: string;
  name: string;
  price: number;
  qty: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LabelItem[];
};

/**
 * Print-optimized sticker sheet.
 * Each label = 50mm x 30mm. Renders a real Code128 barcode via JsBarcode (SVG).
 * "Print" triggers window.print() which the browser-installed print stylesheet
 * (#label-print-area block) constrains to just the sheet.
 */
export function LabelSheet({ open, onOpenChange, items }: Props) {
  const expanded = React.useMemo(
    () => items.flatMap((it) => Array.from({ length: it.qty }, () => it)),
    [items],
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
        <div className="flex items-start justify-between gap-4 border-b border-border p-6 print:hidden">
          <DialogHeader className="flex-1">
            <DialogTitle className="font-mono uppercase tracking-wider">
              label<span className="text-primary">_</span>sheet
            </DialogTitle>
            <DialogDescription className="label-mono">
              {expanded.length} label{expanded.length === 1 ? "" : "s"} · 50×30mm · code128
            </DialogDescription>
          </DialogHeader>
          <Button variant="neon" onClick={handlePrint}>
            <Printer className="mr-1 h-4 w-4" /> print
          </Button>
        </div>

        <div
          id="label-print-area"
          className="max-h-[70vh] overflow-y-auto bg-white p-6 print:max-h-none print:overflow-visible print:p-0"
        >
          {expanded.length === 0 ? (
            <p className="label-mono text-center text-neutral-500">
              select at least one product.
            </p>
          ) : (
            <div className="label-grid">
              {expanded.map((it, idx) => (
                <Label key={`${it.sku}-${idx}`} item={it} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Print stylesheet — isolates the sheet, hides everything else */}
      <style>{`
        .label-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, 50mm);
          gap: 4mm;
          justify-content: center;
        }
        @media print {
          @page { size: A4; margin: 8mm; }
          body * { visibility: hidden !important; }
          #label-print-area, #label-print-area * { visibility: visible !important; }
          #label-print-area {
            position: fixed; inset: 0; background: white;
            padding: 0 !important; margin: 0;
          }
          .label-grid { gap: 2mm; }
        }
      `}</style>
    </Dialog>
  );
}

function Label({ item }: { item: LabelItem }) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, item.sku, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: 36,
        width: 1.4,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      /* invalid sku — render nothing extra */
    }
  }, [item.sku]);

  return (
    <div
      className="flex flex-col justify-between border border-neutral-300 bg-white p-1.5 text-black"
      style={{ width: "50mm", height: "30mm" }}
    >
      <p
        className="truncate font-sans font-semibold leading-tight text-black"
        style={{ fontSize: "9pt" }}
        title={item.name}
      >
        {item.name}
      </p>
      <div className="flex items-center justify-center">
        <svg ref={svgRef} className="h-[12mm] w-full" />
      </div>
      <div className="flex items-center justify-between font-mono text-black" style={{ fontSize: "7pt" }}>
        <span>{item.sku}</span>
        <span className="font-semibold">{formatINR(item.price)}</span>
      </div>
    </div>
  );
}
