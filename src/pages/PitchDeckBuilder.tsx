import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Calculator, Save, Download, ArrowLeft, Send } from "lucide-react";
import SendPitchDeckModal from "@/components/pitch-deck/SendPitchDeckModal";

const defaultPitchDeck = {
  title: "New Mortgage Proposal",
  description: "",
  template_type: "purchase",
  mortgage_data: {
    currentLoan: {
      balance: 200000,
      rate: 4.5,
      payment: 1013,
      term: 30,
      type: "Conventional"
    },
    proposedLoan: {
      amount: 200000,
      rate: 3.5,
      payment: 898,
      term: 30,
      type: "Conventional"
    },
    savings: {
      monthly: 115,
      lifetime: 41400
    }
  },
  client_info: {
    name: "",
    email: "",
    phone: "",
    address: ""
  },
  loan_officer_info: {
    name: "",
    nmls_id: "",
    company: "",
    phone: "",
    email: ""
  }
};

const PitchDeckBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pitchDeck, setPitchDeck] = useState(defaultPitchDeck);
  const [activeTab, setActiveTab] = useState("info");
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  
  useEffect(() => {
    const fetchPitchDeck = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.functions.invoke("retrieve-pitch-deck", {
          body: { pitchDeckId: id }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (data && data.success && data.data) {
          const fetchedDeck = data.data;
          
          if (!fetchedDeck.client_info) {
            fetchedDeck.client_info = defaultPitchDeck.client_info;
          }
          
          if (!fetchedDeck.loan_officer_info) {
            fetchedDeck.loan_officer_info = defaultPitchDeck.loan_officer_info;
          }
          
          if (!fetchedDeck.mortgage_data) {
            fetchedDeck.mortgage_data = defaultPitchDeck.mortgage_data;
          } else {
            if (!fetchedDeck.mortgage_data.currentLoan) {
              fetchedDeck.mortgage_data.currentLoan = defaultPitchDeck.mortgage_data.currentLoan;
            }
            if (!fetchedDeck.mortgage_data.proposedLoan) {
              fetchedDeck.mortgage_data.proposedLoan = defaultPitchDeck.mortgage_data.proposedLoan;
            }
            if (!fetchedDeck.mortgage_data.savings) {
              fetchedDeck.mortgage_data.savings = defaultPitchDeck.mortgage_data.savings;
            }
          }
          setPitchDeck(fetchedDeck);
        }
      } catch (error: any) {
        console.error("Error fetching pitch deck:", error);
        toast.error(`Failed to load pitch deck: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPitchDeck();
  }, [id]);
  
  useEffect(() => {
    if (!pitchDeck?.mortgage_data) return;
    
    if (pitchDeck.mortgage_data.currentLoan && pitchDeck.mortgage_data.currentLoan.balance && pitchDeck.mortgage_data.currentLoan.rate && pitchDeck.mortgage_data.currentLoan.term) {
      const monthlyRate = pitchDeck.mortgage_data.currentLoan.rate / 100 / 12;
      const numPayments = pitchDeck.mortgage_data.currentLoan.term * 12;
      const payment = (pitchDeck.mortgage_data.currentLoan.balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments));
      
      if (Math.abs(payment - pitchDeck.mortgage_data.currentLoan.payment) > 1) {
        setPitchDeck(prev => ({
          ...prev,
          mortgage_data: {
            ...prev.mortgage_data,
            currentLoan: {
              ...prev.mortgage_data.currentLoan,
              payment: Math.round(payment)
            }
          }
        }));
      }
    }
    
    if (pitchDeck.mortgage_data.proposedLoan && pitchDeck.mortgage_data.proposedLoan.amount && pitchDeck.mortgage_data.proposedLoan.rate && pitchDeck.mortgage_data.proposedLoan.term) {
      const monthlyRate = pitchDeck.mortgage_data.proposedLoan.rate / 100 / 12;
      const numPayments = pitchDeck.mortgage_data.proposedLoan.term * 12;
      const payment = (pitchDeck.mortgage_data.proposedLoan.amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments));
      
      if (Math.abs(payment - pitchDeck.mortgage_data.proposedLoan.payment) > 1) {
        setPitchDeck(prev => ({
          ...prev,
          mortgage_data: {
            ...prev.mortgage_data,
            proposedLoan: {
              ...prev.mortgage_data.proposedLoan,
              payment: Math.round(payment)
            }
          }
        }));
      }
    }
    
    if (pitchDeck.mortgage_data.currentLoan && pitchDeck.mortgage_data.proposedLoan) {
      const monthlySavings = Math.round(pitchDeck.mortgage_data.currentLoan.payment - pitchDeck.mortgage_data.proposedLoan.payment);
      const lifetimeSavings = Math.round(monthlySavings * pitchDeck.mortgage_data.proposedLoan.term * 12);
      
      setPitchDeck(prev => {
        const updatedDeck = {...prev};
        if (!updatedDeck.mortgage_data) {
          updatedDeck.mortgage_data = {
            currentLoan: defaultPitchDeck.mortgage_data.currentLoan,
            proposedLoan: defaultPitchDeck.mortgage_data.proposedLoan,
            savings: defaultPitchDeck.mortgage_data.savings
          };
        }
        
        updatedDeck.mortgage_data = {
          ...updatedDeck.mortgage_data,
          savings: {
            monthly: monthlySavings,
            lifetime: lifetimeSavings
          }
        };
        
        return updatedDeck;
      });
    }
  }, [
    pitchDeck?.mortgage_data?.currentLoan?.balance,
    pitchDeck?.mortgage_data?.currentLoan?.rate,
    pitchDeck?.mortgage_data?.currentLoan?.term,
    pitchDeck?.mortgage_data?.proposedLoan?.amount,
    pitchDeck?.mortgage_data?.proposedLoan?.rate,
    pitchDeck?.mortgage_data?.proposedLoan?.term
  ]);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-pitch-deck", {
        body: {
          action: "save",
          pitchDeckData: pitchDeck,
          pitchDeckId: id,
          generatePdf: false
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.success) {
        toast.success("Pitch deck saved successfully");
        if (!id && data.data?.id) {
          navigate(`/pitch-deck/builder/${data.data.id}`, { replace: true });
        }
      }
    } catch (error: any) {
      console.error("Error saving pitch deck:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const saveResponse = await supabase.functions.invoke("save-pitch-deck", {
        body: {
          action: "save",
          pitchDeckData: pitchDeck,
          pitchDeckId: id
        }
      });
      
      if (saveResponse.error) {
        throw new Error(saveResponse.error.message);
      }
      
      const { data, error } = await supabase.functions.invoke("save-pitch-deck", {
        body: {
          action: "get-pdf",
          pitchDeckId: id || saveResponse.data?.data?.id,
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data && data.pdfData) {
        const link = document.createElement("a");
        link.href = data.pdfData;
        link.download = `${pitchDeck.title.replace(/\s+/g, "_")}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("PDF downloaded successfully");
      }
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      toast.error(`Failed to download PDF: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };
  
  const handleOpenSendModal = () => {
    handleSave().then(() => {
      setIsSendModalOpen(true);
    });
  };

  const handleChange = (field: string, value: any) => {
    if (field.includes(".")) {
      const [section, subField] = field.split(".");
      setPitchDeck(prev => {
        const updatedDeck = {...prev};
        if (!updatedDeck[section as keyof typeof updatedDeck]) {
          updatedDeck[section as keyof typeof updatedDeck] = {} as any;
        }
        
        const sectionObj = updatedDeck[section as keyof typeof updatedDeck] as Record<string, any>;
        sectionObj[subField] = value;
        
        return updatedDeck;
      });
    } else {
      setPitchDeck(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  
  const handleInfoChange = (section: string, field: string, value: any) => {
    setPitchDeck(prev => {
      const updatedDeck = {...prev};
      if (!updatedDeck[section as keyof typeof updatedDeck]) {
        updatedDeck[section as keyof typeof updatedDeck] = {} as any;
      }
      
      const sectionObj = updatedDeck[section as keyof typeof updatedDeck] as Record<string, any>;
      sectionObj[field] = value;
      
      return updatedDeck;
    });
  };
  
  const handleMortgageDataChange = (section: string, field: string, value: any) => {
    setPitchDeck(prev => {
      const updatedDeck = {...prev};
      if (!updatedDeck.mortgage_data) {
        updatedDeck.mortgage_data = {
          currentLoan: defaultPitchDeck.mortgage_data.currentLoan,
          proposedLoan: defaultPitchDeck.mortgage_data.proposedLoan,
          savings: defaultPitchDeck.mortgage_data.savings
        };
      }
      
      if (!updatedDeck.mortgage_data[section as keyof typeof updatedDeck.mortgage_data]) {
        if (section === 'currentLoan') {
          updatedDeck.mortgage_data[section] = defaultPitchDeck.mortgage_data.currentLoan;
        } else if (section === 'proposedLoan') {
          updatedDeck.mortgage_data[section] = defaultPitchDeck.mortgage_data.proposedLoan;
        } else if (section === 'savings') {
          updatedDeck.mortgage_data[section] = defaultPitchDeck.mortgage_data.savings;
        }
      }
      
      const sectionObj = updatedDeck.mortgage_data[section as keyof typeof updatedDeck.mortgage_data] as Record<string, any>;
      sectionObj[field] = parseFloat(value) || 0;
      
      return updatedDeck;
    });
  };

  const handleBack = () => {
    navigate("/pitch-deck");
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p>Loading pitch deck...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack} title="Back to Pitch Decks">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Pitch Deck Builder</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={downloading || !id}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Downloading..." : "Download PDF"}
            </Button>

            <Button 
              variant="default"
              onClick={handleOpenSendModal}
              disabled={!id}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send to Client
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>
              <Input 
                value={pitchDeck.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="text-xl font-bold border-none p-0 h-auto text-black focus-visible:ring-0"
                placeholder="Enter Pitch Deck Title"
              />
            </CardTitle>
            <CardDescription>
              <Input 
                value={pitchDeck.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                className="border-none p-0 h-auto text-gray-600 focus-visible:ring-0"
                placeholder="Enter description (optional)"
              />
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 mb-6">
                <TabsTrigger value="info">Loan Info</TabsTrigger>
                <TabsTrigger value="client">Client Info</TabsTrigger>
                <TabsTrigger value="comparison">Loan Comparison</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                        Current Loan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Loan Balance</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                          <Input
                            type="number"
                            value={pitchDeck.mortgage_data?.currentLoan?.balance || ''}
                            onChange={(e) => handleMortgageDataChange('currentLoan', 'balance', e.target.value)}
                            className="pl-7"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                        <Input
                          type="number"
                          step="0.125"
                          value={pitchDeck.mortgage_data?.currentLoan?.rate || ''}
                          onChange={(e) => handleMortgageDataChange('currentLoan', 'rate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Term (Years)</label>
                        <Input
                          type="number"
                          value={pitchDeck.mortgage_data?.currentLoan?.term || ''}
                          onChange={(e) => handleMortgageDataChange('currentLoan', 'term', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Loan Type</label>
                        <Input
                          type="text"
                          value={pitchDeck.mortgage_data?.currentLoan?.type || ''}
                          onChange={(e) => handleMortgageDataChange('currentLoan', 'type', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Monthly Payment</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                          <Input
                            type="number"
                            value={pitchDeck.mortgage_data?.currentLoan?.payment || ''}
                            onChange={(e) => handleMortgageDataChange('currentLoan', 'payment', e.target.value)}
                            className="pl-7"
                            disabled
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        Proposed Loan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Loan Amount</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                          <Input
                            type="number"
                            value={pitchDeck.mortgage_data?.proposedLoan?.amount || ''}
                            onChange={(e) => handleMortgageDataChange('proposedLoan', 'amount', e.target.value)}
                            className="pl-7"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                        <Input
                          type="number"
                          step="0.125"
                          value={pitchDeck.mortgage_data?.proposedLoan?.rate || ''}
                          onChange={(e) => handleMortgageDataChange('proposedLoan', 'rate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Term (Years)</label>
                        <Input
                          type="number"
                          value={pitchDeck.mortgage_data?.proposedLoan?.term || ''}
                          onChange={(e) => handleMortgageDataChange('proposedLoan', 'term', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Loan Type</label>
                        <Input
                          type="text"
                          value={pitchDeck.mortgage_data?.proposedLoan?.type || ''}
                          onChange={(e) => handleMortgageDataChange('proposedLoan', 'type', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Monthly Payment</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                          <Input
                            type="number"
                            value={pitchDeck.mortgage_data?.proposedLoan?.payment || ''}
                            onChange={(e) => handleMortgageDataChange('proposedLoan', 'payment', e.target.value)}
                            className="pl-7"
                            disabled
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Loan Officer Information</CardTitle>
                    <CardDescription>Enter your information to personalize the proposal</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Your Name</label>
                        <Input
                          value={pitchDeck.loan_officer_info?.name || ''}
                          onChange={(e) => handleInfoChange('loan_officer_info', 'name', e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">NMLS ID</label>
                        <Input
                          value={pitchDeck.loan_officer_info?.nmls_id || ''}
                          onChange={(e) => handleInfoChange('loan_officer_info', 'nmls_id', e.target.value)}
                          placeholder="12345678"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Company</label>
                        <Input
                          value={pitchDeck.loan_officer_info?.company || ''}
                          onChange={(e) => handleInfoChange('loan_officer_info', 'company', e.target.value)}
                          placeholder="Mortgage Company Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <Input
                          value={pitchDeck.loan_officer_info?.phone || ''}
                          onChange={(e) => handleInfoChange('loan_officer_info', 'phone', e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <Input
                          value={pitchDeck.loan_officer_info?.email || ''}
                          onChange={(e) => handleInfoChange('loan_officer_info', 'email', e.target.value)}
                          placeholder="john.doe@example.com"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="client" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Client Information</CardTitle>
                    <CardDescription>Enter client details to personalize the proposal</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Client Name</label>
                        <Input
                          value={pitchDeck.client_info?.name || ''}
                          onChange={(e) => handleInfoChange('client_info', 'name', e.target.value)}
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <Input
                          value={pitchDeck.client_info?.email || ''}
                          onChange={(e) => handleInfoChange('client_info', 'email', e.target.value)}
                          placeholder="jane.smith@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <Input
                          value={pitchDeck.client_info?.phone || ''}
                          onChange={(e) => handleInfoChange('client_info', 'phone', e.target.value)}
                          placeholder="(555) 987-6543"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Address</label>
                        <Input
                          value={pitchDeck.client_info?.address || ''}
                          onChange={(e) => handleInfoChange('client_info', 'address', e.target.value)}
                          placeholder="123 Main St, Anytown, USA"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="comparison" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Savings Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="bg-gray-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Monthly Savings</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            ${pitchDeck.mortgage_data?.savings?.monthly || 0}
                          </div>
                          <p className="text-sm text-gray-600">per month</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gray-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Lifetime Savings</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            ${(pitchDeck.mortgage_data?.savings?.lifetime || 0).toLocaleString()}
                          </div>
                          <p className="text-sm text-gray-600">over loan term</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gray-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Rate Difference</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {(
                              (pitchDeck.mortgage_data?.currentLoan?.rate || 0) -
                              (pitchDeck.mortgage_data?.proposedLoan?.rate || 0)
                            ).toFixed(3)}%
                          </div>
                          <p className="text-sm text-gray-600">lower rate</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="mt-8">
                      <h3 className="font-medium mb-4">Detailed Comparison</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border px-4 py-2 text-left">Feature</th>
                              <th className="border px-4 py-2 text-right">Current Loan</th>
                              <th className="border px-4 py-2 text-right">Proposed Loan</th>
                              <th className="border px-4 py-2 text-right">Difference</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Principal</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.currentLoan?.balance || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.proposedLoan?.amount || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(
                                (pitchDeck.mortgage_data?.proposedLoan?.amount || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.balance || 0)
                              ).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Interest Rate</td>
                              <td className="border px-4 py-2 text-right">{(pitchDeck.mortgage_data?.currentLoan?.rate || 0).toFixed(3)}%</td>
                              <td className="border px-4 py-2 text-right">{(pitchDeck.mortgage_data?.proposedLoan?.rate || 0).toFixed(3)}%</td>
                              <td className="border px-4 py-2 text-right">{(
                                (pitchDeck.mortgage_data?.proposedLoan?.rate || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.rate || 0)
                              ).toFixed(3)}%</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Monthly Payment</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.currentLoan?.payment || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(pitchDeck.mortgage_data?.proposedLoan?.payment || 0).toLocaleString()}</td>
                              <td className="border px-4 py-2 text-right">${(
                                (pitchDeck.mortgage_data?.proposedLoan?.payment || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.payment || 0)
                              ).toLocaleString()}</td>
                            </tr>
                            <tr>
                              <td className="border px-4 py-2 font-medium">Term (years)</td>
                              <td className="border px-4 py-2 text-right">{pitchDeck.mortgage_data?.currentLoan?.term || 0}</td>
                              <td className="border px-4 py-2 text-right">{pitchDeck.mortgage_data?.proposedLoan?.term || 0}</td>
                              <td className="border px-4 py-2 text-right">{
                                (pitchDeck.mortgage_data?.proposedLoan?.term || 0) - 
                                (pitchDeck.mortgage_data?.currentLoan?.term || 0)
                              }</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="preview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Preview</CardTitle>
                    <CardDescription>
                      This is how your pitch deck will appear when downloaded as a PDF
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-8 bg-white shadow-sm">
                      <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold">{pitchDeck.title}</h2>
                        {pitchDeck.description && (
                          <p className="text-gray-600 mt-2">{pitchDeck.description}</p>
                        )}
                        {pitchDeck.client_info?.name && (
                          <p className="text-gray-700 mt-4">Prepared for: {pitchDeck.client_info.name}</p>
                        )}
                        {pitchDeck.loan_officer_info?.name && (
                          <div className="mt-4 text-sm text-gray-600">
                            <p>Prepared by: {pitchDeck.loan_officer_info.name}</p>
                            {pitchDeck.loan_officer_info.nmls_id && (
                              <p>NMLS# {pitchDeck.loan_officer_info.nmls_id}</p>
                            )}
                            {pitchDeck.loan_officer_info.company && (
                              <p>{pitchDeck.loan_officer_info.company}</p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="mb-8">
                        <h3 className="text-xl font-semibold mb-4">Loan Details</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium mb-2">Current Loan</h4>
                            <div className="space-y-1">
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Loan Balance:</span>
                                <span>${(pitchDeck.mortgage_data?.currentLoan?.balance || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Interest Rate:</span>
                                <span>{(pitchDeck.mortgage_data?.currentLoan?.rate || 0).toFixed(3)}%</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Monthly Payment:</span>
                                <span>${(pitchDeck.mortgage_data?.currentLoan?.payment || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Term:</span>
                                <span>{pitchDeck.mortgage_data?.currentLoan?.term || 0} years</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Loan Type:</span>
                                <span>{pitchDeck.mortgage_data?.currentLoan?.type || ''}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Proposed Loan</h4>
                            <div className="space-y-1">
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Loan Amount:</span>
                                <span>${(pitchDeck.mortgage_data?.proposedLoan?.amount || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Interest Rate:</span>
                                <span>{(pitchDeck.mortgage_data?.proposedLoan?.rate || 0).toFixed(3)}%</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Monthly Payment:</span>
                                <span>${(pitchDeck.mortgage_data?.proposedLoan?.payment || 0).toLocaleString()}</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Term:</span>
                                <span>{pitchDeck.mortgage_data?.proposedLoan?.term || 0} years</span>
                              </p>
                              <p className="text-sm flex justify-between">
                                <span className="text-gray-600">Loan Type:</span>
                                <span>{pitchDeck.mortgage_data?.proposedLoan?.type || ''}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-6">
                        <h3 className="text-xl font-semibold mb-4">Potential Savings</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="p-4 bg-green-50 rounded-lg text-center">
                            <p className="text-green-600 text-lg font-semibold">
                              ${pitchDeck.mortgage_data?.savings?.monthly || 0}
                            </p>
                            <p className="text-sm text-gray-600">Monthly Savings</p>
                          </div>
                          
                          <div className="p-4 bg-green-50 rounded-lg text-center">
                            <p className="text-green-600 text-lg font-semibold">
                              ${(pitchDeck.mortgage_data?.savings?.lifetime || 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">Lifetime Savings</p>
                          </div>
                          
                          <div className="p-4 bg-green-50 rounded-lg text-center">
                            <p className="text-green-600 text-lg font-semibold">
                              {(
                                (pitchDeck.mortgage_data?.currentLoan?.rate || 0) -
                                (pitchDeck.mortgage_data?.proposedLoan?.rate || 0)
                              ).toFixed(3)}%
                            </p>
                            <p className="text-sm text-gray-600">Rate Reduction</p>
                          </div>
                        </div>
                      </div>
                      
                      {pitchDeck.loan_officer_info && Object.values(pitchDeck.loan_officer_info).some(val => val) && (
                        <div className="mt-8 pt-6 border-t text-center">
                          <h3 className="text-lg font-medium mb-2">Contact Information</h3>
                          <p>{pitchDeck.loan_officer_info.name}</p>
                          {pitchDeck.loan_officer_info.nmls_id && <p>NMLS# {pitchDeck.loan_officer_info.nmls_id}</p>}
                          {pitchDeck.loan_officer_info.company && <p>{pitchDeck.loan_officer_info.company}</p>}
                          {pitchDeck.loan_officer_info.phone && <p>{pitchDeck.loan_officer_info.phone}</p>}
                          {pitchDeck.loan_officer_info.email && <p>{pitchDeck.loan_officer_info.email}</p>}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {isSendModalOpen && (
        <SendPitchDeckModal
          isOpen={isSendModalOpen}
          onClose={() => setIsSendModalOpen(false)}
          pitchDeck={id ? { 
            id, 
            title: pitchDeck.title,
            description: pitchDeck.description,
            client_info: pitchDeck.client_info,
            loan_officer_info: pitchDeck.loan_officer_info,
            mortgage_data: pitchDeck.mortgage_data
          } : null}
        />
      )}
    </MainLayout>
  );
};

export default PitchDeckBuilder;
