import * as React from 'react';
import { useState, useRef } from 'react';
import { FileUp, Info, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Athlete } from '../types';
import { seedDatabase } from '../services/athleteService';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CSVBulkUploadProps {
  onComplete: () => void;
  isAdmin: boolean;
}

export function CSVBulkUpload({ onComplete, isAdmin }: CSVBulkUploadProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please select a valid CSV file.');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setStats(null);
    }
  };

  const processCSV = () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawData = results.data as any[];
          
          // Basic validation and mapping
          const mappedAthletes: Athlete[] = rawData.map((row, index) => {
            // We need to ensure required fields exist
            if (!row.name || !row.hometownState) {
              console.warn(`Row ${index} missing required fields`, row);
            }

            return {
              id: row.id || crypto.randomUUID(),
              name: String(row.name || 'Unknown Athlete'),
              gender: String(row.gender || 'Women') as 'Men' | 'Women',
              sport: String(row.sport || 'General'),
              hometownCity: String(row.hometownCity || 'Unknown'),
              hometownState: String(row.hometownState || 'US').toUpperCase(),
              lat: Number(row.lat || 0),
              lng: Number(row.lng || 0),
              isParalympian: Boolean(row.isParalympian),
              participations: Array.isArray(row.participations) 
                ? row.participations 
                : [{ year: 2024, season: 'Summer' }], // Default Fallback
              subcategories: Array.isArray(row.subcategories) ? row.subcategories : [],
              imageUrl: row.imageUrl || `https://i.pravatar.cc/150?u=${row.name || index}`
            };
          });

          if (mappedAthletes.length === 0) {
            throw new Error('No valid athlete records found in CSV.');
          }

          await seedDatabase(mappedAthletes);
          setStats({ count: mappedAthletes.length });
          onComplete();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to process CSV file.');
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setError(`CSV Parse Error: ${err.message}`);
        setLoading(false);
      }
    });
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
          <FileUp className="w-3 h-3 mr-2" />
          Bulk CSV Import
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none border-ink bg-paper sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="serif text-2xl uppercase tracking-tight">Bulk Registry Import</DialogTitle>
          <DialogDescription className="mono text-[10px] uppercase tracking-widest opacity-60">
            Upload CSV to synchronize athlete records
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed p-8 text-center cursor-pointer transition-all
              ${file ? 'border-gold bg-gold/5' : 'border-ink/20 hover:border-gold/50'}
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".csv"
            />
            {file ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-gold mb-2" />
                <p className="mono text-[11px] uppercase font-bold">{file.name}</p>
                <p className="mono text-[9px] uppercase opacity-40 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <FileUp className="w-8 h-8 opacity-20 mb-2" />
                <p className="mono text-[10px] uppercase tracking-widest opacity-40">Choose CSV File or Drag & Drop</p>
              </div>
            )}
          </div>

          <div className="bg-ink/5 p-4 border border-ink/10 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 text-gold mt-0.5" />
              <p className="mono text-[9px] uppercase leading-relaxed opacity-60">
                Required Headers: name, sport, hometownCity, hometownState, lat, lng
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 text-gold mt-0.5" />
              <p className="mono text-[9px] uppercase leading-relaxed opacity-60">
                Optional: isParalympian, gender
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 p-3 border border-destructive/20 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="mono text-[10px] uppercase font-bold text-destructive">{error}</p>
            </div>
          )}

          {stats && (
            <div className="bg-gold/10 p-3 border border-gold/20 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-gold" />
              <p className="mono text-[10px] uppercase font-bold text-gold"> Successfully Imported {stats.count} Records</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 rounded-none mono text-[10px] uppercase h-11"
              onClick={() => {
                setFile(null);
                setStats(null);
                setError(null);
              }}
              disabled={loading || !file}
            >
              Clear
            </Button>
            <Button 
              className="flex-2 rounded-none bg-ink text-paper hover:bg-gold hover:text-black mono text-[11px] uppercase tracking-[0.2em] h-11 disabled:opacity-50"
              onClick={processCSV}
              disabled={loading || !file}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : 'Start Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
