import React, { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Props {
  itemId: string;
  currentStock: number;
  unit: string;
  onClose: () => void;
  onUpdated: () => Promise<void> | void;
}

const AdjustLooseItemsDialog: React.FC<Props> = ({ itemId, currentStock, unit, onClose, onUpdated }) => {
  const [delta, setDelta] = useState<string>("0");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      const deltaUnits = parseInt(delta) || 0;
      const nextStock = Math.max(0, currentStock + deltaUnits);
      const payload: any = { currentStock: nextStock, looseDelta: deltaUnits };
      const token = localStorage.getItem('token');

      await api.put(
        `/lab/inventory/${itemId}`,
        payload,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      await onUpdated();
      onClose();
      toast({ title: "Stock Updated", description: "Loose items adjusted successfully." });
    } catch (e) {
      console.error("Failed to adjust loose items stock", e);
      toast({ title: "Error", description: "Failed to adjust stock", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Adjust Loose Items</DialogTitle>
      </DialogHeader>
      <div className="space-y-2">
        <Label>Units to add/remove</Label>
        <Input type="number" value={delta} onChange={e=> setDelta(e.target.value)} />
        <p className="text-xs text-muted-foreground">Current: {currentStock} {unit}. You can enter negative to remove units.</p>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={save} disabled={saving}>Save</Button>
      </div>
    </DialogContent>
  );
};

export default AdjustLooseItemsDialog;
