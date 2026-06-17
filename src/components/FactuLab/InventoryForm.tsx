"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  FileDown, 
  Share2, 
  Settings2, 
  Microscope, 
  Tag, 
  Fingerprint, 
  Hash,
  Loader2,
  CheckCircle2,
  DollarSign,
  Percent,
  Calculator,
  Building2,
  FileText,
  Save,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { generateInventoryPDF } from '@/lib/pdf-utils';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'factulab_v1_local_data';

const formSchema = z.object({
  distribuidor: z.string().min(2, { message: "El distribuidor debe tener al menos 2 caracteres." }),
  marca: z.string().min(1, { message: "La marca es requerida." }),
  modelo: z.string().min(1, { message: "El modelo es requerido." }),
  serie: z.string().min(1, { message: "El número de serie es requerido." }),
  folio: z.string().min(1, { message: "El número de factura/folio es requerido." }),
  pdfTitle: z.string().min(1, { message: "El título del PDF es requerido." }),
  pdfSubtitle: z.string().min(0),
  costo: z.coerce.number().min(0, { message: "El costo debe ser un número positivo." }),
  ivaPorcentaje: z.coerce.number().min(0).max(100),
  ivaCalculado: z.number(),
  total: z.number(),
  especificacion: z.string().min(1, { message: "La especificación técnica es requerida." }),
  fecha: z.date({
    required_error: "La fecha es requerida.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

// Helper function to parse date from D(D)/M(M)/YYYY format
const parseCustomDate = (input: string): Date | null => {
  const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = input.trim().match(regex);
  
  if (!match) return null;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  // Validate date components
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
    return null;
  }
  
  const date = new Date(year, month - 1, day);
  
  // Validate that the date is valid (e.g., 31/02/2020 should fail)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  
  return date;
};

// Helper function to format date in Spanish
const formatDateSpanish = (date: Date): string => {
  const monthNames = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
};

export default function InventoryForm() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dateInput, setDateInput] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      distribuidor: "",
      marca: "",
      modelo: "",
      serie: "",
      folio: "",
      pdfTitle: "FACTULAB",
      pdfSubtitle: "Sistema de Facturación",
      costo: 0,
      ivaPorcentaje: 16,
      ivaCalculado: 0,
      total: 0,
      especificacion: "",
      fecha: new Date(),
    },
  });

  const watchCosto = form.watch("costo");
  const watchIvaPorcentaje = form.watch("ivaPorcentaje");
  const watchAllFields = form.watch();

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Convert date string back to Date object
        if (parsed.fecha) {
          parsed.fecha = new Date(parsed.fecha);
        }
        form.reset(parsed);
      } catch (e) {
        console.error("Error al cargar datos locales", e);
      }
    } else {
      // Default values if no data
      const randomFolio = `FAC-${Math.floor(1000 + Math.random() * 9000)}`;
      form.setValue("folio", randomFolio);
      form.setValue("fecha", new Date());
    }
  }, [form]);

  // Save to localStorage when fields change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchAllFields));
    }
  }, [watchAllFields, mounted]);

  // Recalculate financial values
  useEffect(() => {
    const costo = Number(watchCosto) || 0;
    const ivaPct = Number(watchIvaPorcentaje) || 0;
    const ivaCalc = costo * (ivaPct / 100);
    const total = costo + ivaCalc;

    form.setValue("ivaCalculado", ivaCalc, { shouldValidate: true });
    form.setValue("total", total, { shouldValidate: true });
  }, [watchCosto, watchIvaPorcentaje, form]);

  const onSubmit = async (values: FormValues) => {
    setIsGenerating(true);
    try {
      const doc = await generateInventoryPDF(values);
      const fileName = `FactuLab_${values.folio}_${values.modelo}.pdf`;
      doc.save(fileName);
      setLastGenerated(fileName);
      toast({
        title: "¡PDF Generado con éxito!",
        description: `Se ha descargado el archivo ${fileName} localmente.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al generar PDF",
        description: "Hubo un problema procesando los datos.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!lastGenerated) return;
    toast({
      title: "Compartir habilitado",
      description: "Utilice el archivo descargado para compartir vía email o servicios de mensajería.",
    });
  };

  const currencyFormatter = useMemo(() => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }), []);

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto w-full px-4 py-8 flex items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8">
      <Card className="border-t-4 border-t-primary shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Microscope className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-headline tracking-tight text-primary">FactuLab</CardTitle>
          <CardDescription className="text-base">
            Gestión de Inventario y Facturación Clínica
          </CardDescription>
          <div className="flex justify-center pt-2">
            <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0 h-5 bg-background border-muted-foreground/20">
              <Save className="w-3 h-3 text-accent" />
              Persistencia Local Activa
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <FormField
                  control={form.control}
                  name="pdfTitle"
                  render={({ field }) => (
                    <FormItem className="col-span-full md:col-span-1">
                      <FormLabel>Título del PDF (se convertirá a mayúsculas)</FormLabel>
                      <FormControl>
                        <Input placeholder="FACTULAB" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pdfSubtitle"
                  render={({ field }) => (
                    <FormItem className="col-span-full md:col-span-1">
                      <FormLabel>Subtítulo del PDF</FormLabel>
                      <FormControl>
                        <Input placeholder="Sistema de Facturación" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fecha"
                  render={({ field }) => (
                    <FormItem className="col-span-full md:col-span-1">
                      <FormLabel className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-accent" />
                        Fecha del Documento
                      </FormLabel>
                      <div className="space-y-2">
                        {field.value && (
                          <div className="text-sm font-medium text-primary p-2 bg-primary/5 rounded">
                            {formatDateSpanish(field.value)}
                          </div>
                        )}
                        <FormControl>
                          <Input
                            placeholder="D(D)/M(M)/YYYY (ej: 9/2/1993)"
                            value={dateInput}
                            onChange={(e) => {
                              const input = e.target.value;
                              setDateInput(input);
                              const parsedDate = parseCustomDate(input);
                              if (parsedDate) {
                                field.onChange(parsedDate);
                              }
                            }}
                            onBlur={() => {
                              if (!dateInput && field.value) {
                                setDateInput("");
                              }
                            }}
                            className="bg-secondary/30"
                          />
                        </FormControl>
                        <div className="flex gap-2 items-center">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground">o selecciona</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: es })
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setDateInput("");
                              }}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="folio"
                  render={({ field }) => (
                    <FormItem className="col-span-full md:col-span-1">
                      <FormLabel className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-accent" />
                        Número de Factura / Folio
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: FAC-1234" {...field} className="bg-secondary/30" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="distribuidor"
                  render={({ field }) => (
                    <FormItem className="col-span-full md:col-span-1">
                      <FormLabel className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-accent" />
                        Distribuidor
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: LabSupplies S.A." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="marca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-accent" />
                        Marca
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Thermo Scientific" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="modelo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-accent" />
                        Modelo
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: NanoDrop One" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serie"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-accent" />
                        Número de Serie
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: SN-992384-LX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-full pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-primary">Resumen Financiero</h3>
                  </div>
                  <Separator className="mb-4" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="costo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-accent" />
                            Costo Base (MXN)
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ivaPorcentaje"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-accent" />
                            IVA (%)
                          </FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-dashed border-border">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">IVA Calculado</p>
                      <p className="text-lg font-mono">{currencyFormatter.format(form.watch("ivaCalculado"))}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-accent uppercase font-bold tracking-tighter">Total Final</p>
                      <p className="text-lg font-bold text-primary">{currencyFormatter.format(form.watch("total"))}</p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="especificacion"
                  render={({ field }) => (
                    <FormItem className="col-span-full pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-accent" />
                        <FormLabel>Especificación Técnica</FormLabel>
                      </div>
                      <FormControl>
                        <Textarea 
                          placeholder="Ingrese las especificaciones detalladas del equipo..." 
                          className="min-h-[100px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-5 w-5" />
                      Generar Factura PDF
                    </>
                  )}
                </Button>
                
                {lastGenerated && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-none border-accent text-accent hover:bg-accent/10 h-12 px-6"
                    onClick={handleShare}
                  >
                    <Share2 className="h-5 w-5 mr-2" />
                    Compartir
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
        {lastGenerated && (
          <div className="px-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-accent shrink-0" />
              <div>
                <p className="text-sm font-semibold text-primary">¡Archivo Listo!</p>
                <p className="text-xs text-muted-foreground">{lastGenerated}</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
