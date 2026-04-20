import * as React from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (text: string) => void;
};

/**
 * Camera barcode scanner powered by @zxing/browser.
 * Streams the rear camera into a <video> and invokes onDetected
 * the moment a barcode is decoded, then closes itself.
 */
export function BarcodeScanner({ open, onOpenChange, onDetected }: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const controlsRef = React.useRef<IScannerControls | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);

    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        const all = await BrowserMultiFormatReader.listVideoInputDevices();
        if (cancelled) return;
        setDevices(all);
        const preferred =
          all.find((d) => /back|rear|environment/i.test(d.label))?.deviceId ??
          all[0]?.deviceId;
        const useId = deviceId ?? preferred;
        setDeviceId(useId);

        if (!videoRef.current) return;
        const controls = await reader.decodeFromVideoDevice(
          useId,
          videoRef.current,
          (result, err, ctrls) => {
            if (result) {
              ctrls.stop();
              controlsRef.current = null;
              onDetected(result.getText());
              onOpenChange(false);
            }
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "camera unavailable";
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deviceId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider">
            scan<span className="text-primary">_</span>barcode
          </DialogTitle>
          <DialogDescription className="label-mono">
            point the rear camera at a product barcode.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-sm border border-border bg-black">
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            muted
            playsInline
          />
          {/* targeting reticle */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/3 w-3/4 rounded-sm border-2 border-primary/70 shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_50%,transparent)]" />
          </div>
        </div>

        {error && (
          <p className="label-mono text-warning">// {error.toLowerCase()}</p>
        )}

        {devices.length > 1 && (
          <div className="space-y-1.5">
            <p className="label-mono text-muted-foreground">// camera</p>
            <select
              suppressHydrationWarning
              value={deviceId ?? ""}
              onChange={(e) => setDeviceId(e.target.value)}
              className="h-9 w-full rounded-sm border border-input bg-background px-2 font-mono text-xs uppercase tracking-wide text-foreground"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || d.deviceId.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
