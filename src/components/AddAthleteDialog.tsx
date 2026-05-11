import * as React from 'react';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addAthlete } from '../services/athleteService';

export function AddAthleteDialog({ onAdd, isAdmin }: { onAdd: () => void, isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const athleteData: any = {
      name: formData.get('name'),
      gender: formData.get('gender'),
      sport: formData.get('sport'),
      hometownCity: formData.get('hometownCity'),
      hometownState: String(formData.get('hometownState')).toUpperCase(),
      lat: Number(formData.get('lat')),
      lng: Number(formData.get('lng')),
      isParalympian: formData.get('isParalympian') === 'on',
      participations: [{ year: 2024, season: 'Summer' }], // Default
      subcategories: [],
      imageUrl: `https://i.pravatar.cc/150?u=${Math.random()}`
    };

    setLoading(true);
    try {
      await addAthlete(athleteData);
      onAdd();
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-none border-gold/50 text-gold mono text-[8px] h-8 uppercase tracking-widest hover:bg-gold hover:text-black transition-all"
        >
          <Plus className="w-3 h-3 mr-2" />
          Add Candidate
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none border-ink bg-paper sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="serif text-2xl uppercase tracking-tight">New Candidate Entry</DialogTitle>
          <DialogDescription className="mono text-[10px] uppercase tracking-widest opacity-60">
            Authorized Personnel Only
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="mono text-[10px] uppercase opacity-40">Full Name</Label>
              <input name="name" required className="w-full bg-paper border border-ink/20 p-2 mono text-[11px] uppercase focus:border-gold outline-none" />
            </div>
            <div className="space-y-2">
              <Label className="mono text-[10px] uppercase opacity-40">Gender</Label>
              <Select name="gender" defaultValue="Women">
                <SelectTrigger className="rounded-none border-ink/20 mono text-[11px] uppercase h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-ink bg-paper">
                  <SelectItem value="Men" className="mono text-[11px] uppercase">Men</SelectItem>
                  <SelectItem value="Women" className="mono text-[11px] uppercase">Women</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="mono text-[10px] uppercase opacity-40">Discipline (Sport)</Label>
            <input name="sport" required className="w-full bg-paper border border-ink/20 p-2 mono text-[11px] uppercase focus:border-gold outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="mono text-[10px] uppercase opacity-40">Hometown City</Label>
              <input name="hometownCity" required className="w-full bg-paper border border-ink/20 p-2 mono text-[11px] uppercase focus:border-gold outline-none" />
            </div>
            <div className="space-y-2">
              <Label className="mono text-[10px] uppercase opacity-40">State Code</Label>
              <input name="hometownState" required maxLength={2} placeholder="e.g. TX" className="w-full bg-paper border border-ink/20 p-2 mono text-[11px] uppercase focus:border-gold outline-none" />
            </div>
            
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="mono text-[10px] uppercase opacity-40">Latitude</Label>
              <input name="lat" type="number" step="any" required className="w-full bg-paper border border-ink/20 p-2 mono text-[11px] uppercase focus:border-gold outline-none" />
            </div>
            <div className="space-y-2">
              <Label className="mono text-[10px] uppercase opacity-40">Longitude</Label>
              <input name="lng" type="number" step="any" required className="w-full bg-paper border border-ink/20 p-2 mono text-[11px] uppercase focus:border-gold outline-none" />
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="isParalympian" name="isParalympian" className="rounded-none border-ink/40 outline-none" />
            <Label htmlFor="isParalympian" className="mono text-[11px] uppercase font-bold cursor-pointer">Paralympian Status</Label>
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-none bg-ink text-paper hover:bg-gold hover:text-black mono text-[11px] uppercase tracking-[0.2em] h-12">
            {loading ? 'Processing Entry...' : 'Submit to Registry'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
