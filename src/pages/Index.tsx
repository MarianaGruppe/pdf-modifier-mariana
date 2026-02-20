import { PDFSplitter } from "@/components/PDFSplitter";
import { PDFMerger } from "@/components/PDFMerger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-xl font-medium mb-1">PDF Editor</h1>
          <p className="text-sm text-muted-foreground">
            Dokumente teilen und zusammenfügen
          </p>
        </header>

        <Tabs defaultValue="split" className="w-full">
          <TabsList className="mb-6 w-full justify-start border-b border-border bg-transparent h-auto p-0 space-x-6">
            <TabsTrigger
              value="split"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 shadow-none"
            >
              Teilen
            </TabsTrigger>
            <TabsTrigger
              value="merge"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 pb-2 shadow-none"
            >
              Zusammenfügen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="split" className="mt-0">
            <PDFSplitter />
          </TabsContent>

          <TabsContent value="merge" className="mt-0">
            <PDFMerger />
          </TabsContent>
        </Tabs>

        <footer className="mt-16 pt-6">
          <Separator className="mb-6" />
          <div className="text-xs text-muted-foreground space-y-3">
            <p>
              Internes Tool – Bestandteil des Gruppe M Ökosystems. Diese Seite ist nicht öffentlich indexiert.
              Es findet keine serverseitige Datenverarbeitung statt. Es werden keine Cookies verwendet.
              Alle Vorgänge laufen ausschließlich lokal im Browser ab.
            </p>
            <div>
              <p className="font-medium mb-1">Impressum</p>
              <p>Mariana Cannabis Social Clubs Deutschland e.V.</p>
              <p>Kurze Straße 7, 37073 Göttingen</p>
              <p>
                <a href="mailto:kontakt@cscsdeutschland.de" className="underline hover:text-foreground transition-colors">
                  kontakt@cscsdeutschland.de
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
