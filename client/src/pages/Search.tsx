import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Search as SearchIcon,
  MapPin,
  Phone,
  Globe,
  Star,
  MessageSquare,
  Clock,
  Plus,
  Loader2,
  Building2,
  AlertCircle,
  ExternalLink,
  Tags,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface SearchResult {
  type: "local" | "organic";
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number | null;
  reviews: number | null;
  category: string;
  hours: string;
  thumbnail: string;
  snippet?: string;
  placeId: string;
  googleMapsLink: string;
}

interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}

const QUICK_SEARCHES = [
  "top IT companies in Kolkata",
  "digital marketing agencies in Mumbai",
  "software startups in Bangalore",
  "web design companies in Delhi",
  "SaaS companies in Hyderabad",
  "fintech companies in Pune",
];

export default function Search() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingLeads, setAddingLeads] = useState<Set<number>>(new Set());
  const [addAllLoading, setAddAllLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Category logic
  const [categoryName, setCategoryName] = useState("Uncategorized");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [tempCategory, setTempCategory] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempCategory.trim()) {
      setCategoryName(tempCategory.trim());
      setShowCategoryModal(false);
    }
  };

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(
        `/api/search/businesses?q=${encodeURIComponent(q.trim())}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Search failed" }));
        throw new Error(err.error || "Search failed");
      }
      const json: SearchResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const handleQuickSearch = (q: string) => {
    setQuery(q);
    doSearch(q);
  };

  const addAsLead = async (result: SearchResult, index: number, silent = false) => {
    if (!silent) setAddingLeads((prev) => new Set(prev).add(index));
    try {
      const domainMatch = result.website
        ? result.website.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/)
        : null;
      const domain = domainMatch ? domainMatch[1] : "";

      const parts = result.name.split(" ");
      const contactName = parts.slice(0, 2).join(" ");

      const body = {
        businessName: result.name,
        contactName: contactName || result.name,
        email: domain ? `info@${domain}` : "",
        phone: result.phone || "",
        website: result.website || "",
        industry: result.category || "Technology",
        location: result.address || "",
        companySize: "1-10",
        notes: result.snippet || `Found via Google search in category: "${categoryName}"`,
        tags: [categoryName], // Automatically add the category as a tag
      };

      const res = await fetch(`/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to add lead" }));
        throw new Error(err.error || "Failed to add lead");
      }

      if (!silent) {
        toast({
          title: "Lead added!",
          description: `${result.name} has been added to ${categoryName}.`,
        });
      }
      return true;
    } catch (err: any) {
      if (!silent) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
      return false;
    } finally {
      if (!silent) {
        setAddingLeads((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    }
  };

  const handleAddAll = async () => {
    if (!data || data.results.length === 0) return;
    setAddAllLoading(true);
    let successCount = 0;

    toast({
      title: "Adding all leads...",
      description: `Please wait while we import ${data.results.length} leads into "${categoryName}".`,
    });

    for (let i = 0; i < data.results.length; i++) {
      const success = await addAsLead(data.results[i], i, true);
      if (success) successCount++;
    }

    setAddAllLoading(false);
    toast({
      title: "Bulk Import Complete",
      description: `Successfully added ${successCount} leads to the "${categoryName}" category.`,
      variant: successCount > 0 ? "default" : "destructive",
    });
  };

  const handleExportExcel = async () => {
    if (!data || data.results.length === 0) return;
    setExportLoading(true);

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Lead Discovery Data");

      // Make gridlines visible explicitly
      worksheet.views = [{ showGridLines: true }];

      // Add a couple of empty rows for neatness
      worksheet.addRow([]);

      // 1. Add styled Title Block at the top
      const titleRow = worksheet.addRow(["LeadForge Elite — Lead Discovery Report"]);
      titleRow.height = 32;
      const titleCell = titleRow.getCell(1);
      titleCell.font = {
        name: "Segoe UI",
        family: 4,
        size: 16,
        bold: true,
        color: { argb: "FF1E3A8A" }, // Dark Blue #1E3A8A
      };

      const metaRow = worksheet.addRow([
        `Category: ${categoryName || "Uncategorized"}  |  Search: "${data.query}"  |  Total: ${data.results.length} Leads  |  Export Date: ${new Date().toLocaleDateString()}`
      ]);
      metaRow.height = 20;
      const metaCell = metaRow.getCell(1);
      metaCell.font = {
        name: "Segoe UI",
        family: 4,
        size: 10,
        italic: true,
        color: { argb: "FF4B5563" }, // Gray #4B5563
      };

      worksheet.addRow([]); // Blank spacer row

      // 2. Define Table Headers
      const headers = [
        "Company Name",
        "Type",
        "Category/Industry",
        "Rating",
        "Reviews",
        "Phone Number",
        "Website",
        "Address",
        "Google Maps Link"
      ];

      const headerRow = worksheet.addRow(headers);
      headerRow.height = 28;

      // Style header row
      headerRow.eachCell((cell) => {
        cell.font = {
          name: "Segoe UI",
          family: 4,
          size: 11,
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2563EB" }, // Slate Blue #2563EB
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "medium", color: { argb: "FF1E3A8A" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } },
        };
      });

      // Align specific headers to center for visual balance
      headerRow.getCell(2).alignment = { vertical: "middle", horizontal: "center" };
      headerRow.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
      headerRow.getCell(5).alignment = { vertical: "middle", horizontal: "center" };

      // 3. Populate Data Rows
      data.results.forEach((item) => {
        const rowData = [
          item.name,
          item.type === "local" ? "Local" : "Organic",
          item.category || "",
          item.rating !== null ? item.rating : "",
          item.reviews !== null ? item.reviews : "",
          item.phone || "",
          item.website || "",
          item.address || "",
          item.googleMapsLink || "",
        ];

        const row = worksheet.addRow(rowData);
        row.height = 22;

        // Apply grid styling to all cells
        row.eachCell((cell, colNumber) => {
          cell.font = {
            name: "Segoe UI",
            family: 4,
            size: 10.5,
            color: { argb: "FF1F2937" }, // Gray 800
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: "left",
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };

          // Custom alignment for specific columns
          if (colNumber === 2 || colNumber === 4 || colNumber === 5) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          }

          // Format numeric columns
          if (colNumber === 4 && item.rating !== null) {
            cell.numFmt = "0.0";
          }
          if (colNumber === 5 && item.reviews !== null) {
            cell.numFmt = "#,##0";
          }
        });

        // --- SPECIFIC CUSTOM STYLING REQUESTED BY USER ---
        
        // A. Company Name Focus Styling (Column 1)
        // Background: Light blue (#E0F2FE), Dark blue text (#0369A1), Bold
        const nameCell = row.getCell(1);
        nameCell.font = {
          name: "Segoe UI",
          family: 4,
          size: 10.5,
          bold: true,
          color: { argb: "FF0369A1" }, // Dark blue/cyan text
        };
        nameCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0F2FE" }, // Light blue background
        };

        // B. Phone Number Focus Styling (Column 6)
        // Background: Light green (#DCFCE7), Dark green text (#15803D)
        const phoneCell = row.getCell(6);
        phoneCell.font = {
          name: "Segoe UI",
          family: 4,
          size: 10.5,
          bold: true,
          color: { argb: "FF15803D" }, // Dark green text
        };
        phoneCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDCFCE7" }, // Light green background
        };
      });

      // 4. Auto-fit column widths
      for (let colNum = 1; colNum <= 9; colNum++) {
        const column = worksheet.getColumn(colNum);
        if (column) {
          let maxLen = 12; // Min width
          if (column.eachCell) {
            column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
              if (rowNumber > 5) {
                const val = cell.value ? String(cell.value) : "";
                if (val.length > maxLen) {
                  maxLen = val.length;
                }
              }
            });
          }
          column.width = Math.min(maxLen + 4, 45);
        }
      }

      // Ensure first column has enough room for Title and metadata spanning
      const firstCol = worksheet.getColumn(1);
      if (firstCol) {
        firstCol.width = Math.max(firstCol.width || 0, 25);
      }

      // Write and Save
      const buffer = await workbook.xlsx.writeBuffer();
      const searchSentence = data.query || query || "Leads_Export";
      const sanitizedSentence = searchSentence.trim().replace(/[^a-zA-Z0-9 -]/g, "").replace(/\s+/g, "_");
      const fileName = `${sanitizedSentence}.xlsx`;
      
      saveAs(new Blob([buffer]), fileName);

      toast({
        title: "Excel Exported!",
        description: `Successfully exported ${data.results.length} leads with premium highlights.`,
      });
    } catch (err: any) {
      console.error("Excel Export Error:", err);
      toast({
        title: "Export failed",
        description: err.message || "An error occurred during Excel export.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Category Selection Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Tags className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Setup Your Search</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter a category name. All leads found during this session will be organized under this tag.
            </p>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Lead Category Name
                </label>
                <Input
                  value={tempCategory}
                  onChange={(e) => setTempCategory(e.target.value)}
                  placeholder="e.g. Kolkata Food Manufacturers"
                  className="h-12 bg-background/50"
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={!tempCategory.trim()}>
                Start Lead Discovery
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Lead Discovery</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-muted-foreground">Discover businesses & import them into</p>
            <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
              {categoryName || "Uncategorized"}
            </Badge>
            <button 
              onClick={() => {
                setTempCategory(categoryName);
                setShowCategoryModal(true);
              }}
              className="text-[10px] text-primary hover:underline ml-1"
            >
              Change
            </button>
          </div>
        </div>
      </div>

      {/* Search Area */}
      <div className="px-6 py-6 border-b border-border flex-shrink-0 bg-card/30">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='e.g. "food manufacturing company in kolkata"'
              className="pl-9 bg-background border-border h-10 text-sm"
              autoFocus={!showCategoryModal}
            />
          </div>
          <Button type="submit" disabled={loading || !query.trim()} className="h-10 px-5">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <SearchIcon className="w-4 h-4 mr-1.5" />
                Search
              </>
            )}
          </Button>
        </form>

        {/* Quick searches */}
        {!data && !loading && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Quick searches:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SEARCHES.map((qs) => (
                <button
                  key={qs}
                  onClick={() => handleQuickSearch(qs)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground"
                >
                  {qs}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Searching Google Maps...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive max-w-xl">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Search failed</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
            </div>
          </div>
        )}

        {data && data.results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Building2 className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No results found for "{data.query}"</p>
            <p className="text-xs text-muted-foreground/60">Try a different search term</p>
          </div>
        )}

        {data && data.results.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-bold text-foreground">{data.results.length}</span> results for{" "}
                <span className="text-primary italic">"{data.query}"</span>
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleExportExcel} 
                  disabled={exportLoading}
                  variant="outline"
                  className="border-emerald-600/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 h-9 px-4 text-xs font-bold gap-2"
                >
                  {exportLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  )}
                  Download Excel
                </Button>
                <Button 
                  onClick={handleAddAll} 
                  disabled={addAllLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 text-xs font-bold gap-2 shadow-lg shadow-emerald-900/20"
                >
                  {addAllLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Add All Leads to "{categoryName}"
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {data.results.map((result, index) => (
                <div
                  key={index}
                  className="group flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {result.thumbnail ? (
                      <img
                        src={result.thumbnail}
                        alt={result.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm text-foreground truncate">
                            {result.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                          >
                            Local
                          </Badge>
                        </div>
                        {result.category && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {result.category}
                          </p>
                        )}
                      </div>

                      {result.rating !== null && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs font-medium text-foreground">
                            {result.rating}
                          </span>
                          {result.reviews !== null && (
                            <span className="text-xs text-muted-foreground">
                              ({result.reviews})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {result.address && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {result.address}
                        </span>
                      )}
                      {result.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {result.phone}
                        </span>
                      )}
                      {result.website && (
                        <a
                          href={result.website.startsWith("http") ? result.website : `https://${result.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Globe className="w-3 h-3" />
                          {result.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addAsLead(result, index)}
                      disabled={addingLeads.has(index)}
                      className="h-8 text-xs gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity border-primary/30 text-primary hover:bg-primary/10"
                    >
                      {addingLeads.has(index) ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      Add Lead
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!data && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <SearchIcon className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Ready for Search</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Searching for leads in the <span className="text-primary font-bold">"{categoryName}"</span> category.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
