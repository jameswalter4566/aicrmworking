import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import PropertyInsightsSection from "@/components/pitch-deck/PropertyInsightsSection";
import LoanComparisonSection from "@/components/pitch-deck/LoanComparisonSection";
import DocumentUploadSection from "@/components/pitch-deck/DocumentUploadSection";

interface PaymentBreakdown {
  principal: number;
  interest: number;
  taxes: number;
  insurance: number;
}

interface LoanDetails {
  balance: number;
  rate: number;
  payment: number;
  term: number;
  type: string;
  paymentBreakdown?: PaymentBreakdown;
}

interface MortgageData {
  propertyValue?: number;
  currentLoan?: LoanDetails;
  proposedLoan?: {
    amount: number;
    rate: number;
    payment: number;
    term: number;
    type: string;
    paymentBreakdown?: PaymentBreakdown;
  };
  savings?: {
    monthly: number;
    lifetime: number;
  };
}

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface LoanOfficerInfo {
  name: string;
  nmls_id: string;
  company: string;
  phone: string;
  email: string;
}

interface PitchDeck {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  mortgage_data: MortgageData;
  client_info?: ClientInfo;
  loan_officer_info?: LoanOfficerInfo;
  created_at: string;
  updated_at: string;
  created_by?: string;
  lead_id?: string;
  template_type?: string;
}

interface PitchDeckRaw {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  mortgage_data: any;
  client_info?: any;
  loan_officer_info?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  lead_id?: string;
  template_type?: string;
}

const YourHomeSolution = () => {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [pitchDeck, setPitchDeck] = useState<PitchDeck | null>(null);
  
  useEffect(() => {
    const fetchPitchDeck = async () => {
      setLoading(true);
      
      try {
        let pitchDeckId = id;
        
        if (!pitchDeckId) {
          const path = location.pathname;
          
          if (path.includes('/your-home-solution/')) {
            const parts = path.split('/');
            pitchDeckId = parts[parts.length - 1];
          }
          else if (path.includes('/yourhomesolution')) {
            const match = path.match(/yourhomesolution\/?(.+)/);
            if (match && match[1]) {
              pitchDeckId = match[1];
            }
          }
        }
        
        if (!pitchDeckId) {
          throw new Error("No identifier found for the pitch deck");
        }
        
        console.log("Fetching pitch deck by ID:", pitchDeckId);
        
        try {
          console.log("Trying to get pitch deck through edge function");
          const { data: publicData, error: publicError } = await supabase.functions.invoke("retrieve-pitch-deck", {
            body: { pitchDeckId }
          });
          
          if (publicError || !publicData || !publicData.data) {
            throw new Error(publicError?.message || "Failed to retrieve public pitch deck");
          }
          
          const data = publicData.data;
          console.log("Pitch deck found via public edge function:", data);
          
          if (data) {
            processAndSetPitchDeck(data as PitchDeckRaw);
          } else {
            throw new Error("Pitch deck not found");
          }
        } catch (funcError) {
          console.error("Error fetching through edge function:", funcError);
          
          console.log("Trying direct query as fallback");
          let query = supabase
            .from('pitch_decks')
            .select('*')
            .eq('id', pitchDeckId);
            
          let { data, error } = await query.single();
          
          if (error || !data) {
            console.error("Error fetching pitch deck with direct query:", error);
            throw new Error("Pitch deck not found or access denied");
          }
          
          console.log("Pitch deck found via direct query:", data);
          processAndSetPitchDeck(data as PitchDeckRaw);
        }
      } catch (error: any) {
        console.error("Error fetching pitch deck:", error);
        toast.error(`Failed to load pitch deck: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    const processAndSetPitchDeck = (rawData: PitchDeckRaw) => {
      const mortgageData: MortgageData = typeof rawData.mortgage_data === 'string' 
        ? JSON.parse(rawData.mortgage_data) 
        : (rawData.mortgage_data as MortgageData) || {};
      
      const clientInfo = rawData.client_info ? 
        (typeof rawData.client_info === 'string' ? JSON.parse(rawData.client_info) : rawData.client_info) as ClientInfo : 
        undefined; 
      
      const loanOfficerInfo = rawData.loan_officer_info ?
        (typeof rawData.loan_officer_info === 'string' ? JSON.parse(rawData.loan_officer_info) : rawData.loan_officer_info) as LoanOfficerInfo :
        undefined;
      
      const enhancedData: PitchDeck = {
        ...rawData,
        mortgage_data: {
          propertyValue: mortgageData.propertyValue || (mortgageData.currentLoan?.balance ? mortgageData.currentLoan.balance * 1.25 : 500000),
          currentLoan: mortgageData.currentLoan ? {
            ...mortgageData.currentLoan,
            paymentBreakdown: mortgageData.currentLoan.paymentBreakdown || calculateDefaultPaymentBreakdown(
              mortgageData.currentLoan.payment,
              mortgageData.currentLoan.balance,
              mortgageData.currentLoan.rate,
              mortgageData.currentLoan.term
            )
          } : undefined,
          proposedLoan: mortgageData.proposedLoan ? {
            ...mortgageData.proposedLoan,
            paymentBreakdown: mortgageData.proposedLoan.paymentBreakdown || calculateDefaultPaymentBreakdown(
              mortgageData.proposedLoan.payment,
              mortgageData.proposedLoan.amount,
              mortgageData.proposedLoan.rate,
              mortgageData.proposedLoan.term
            )
          } : undefined,
          savings: mortgageData.savings
        },
        client_info: clientInfo,
        loan_officer_info: loanOfficerInfo
      };
      
      setPitchDeck(enhancedData);
    };
    
    fetchPitchDeck();
  }, [id, location.pathname]);
  
  const calculateDefaultPaymentBreakdown = (
    totalPayment: number,
    loanAmount: number,
    interestRate: number,
    term: number
  ): PaymentBreakdown => {
    const monthlyRate = interestRate / 100 / 12;
    const totalMonths = term * 12;
    const principalAndInterest = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
                               (Math.pow(1 + monthlyRate, totalMonths) - 1);
    
    const taxes = loanAmount * 0.015 / 12;
    const insurance = loanAmount * 0.0035 / 12;
    
    const interest = loanAmount * monthlyRate;
    const principal = principalAndInterest - interest;
    
    return {
      principal: Math.round(principal),
      interest: Math.round(interest),
      taxes: Math.round(taxes),
      insurance: Math.round(insurance)
    };
  };
  
  const handleDownloadPDF = async () => {
    if (!pitchDeck) return;
    
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("save-pitch-deck", {
        body: {
          action: "get-pdf",
          pitchDeckId: pitchDeck.id,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading your home solution...</p>
        </div>
      </div>
    );
  }

  if (!pitchDeck) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Mortgage Proposal Not Found</h1>
          <p className="mb-6">The mortgage proposal you're looking for could not be found.</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const currentLoan = pitchDeck.mortgage_data.currentLoan;
  const proposedLoan = pitchDeck.mortgage_data.proposedLoan;
  const savings = pitchDeck.mortgage_data.savings;
  const propertyValue = pitchDeck.mortgage_data.propertyValue || (currentLoan ? currentLoan.balance * 1.25 : 0);
  const clientInfo = pitchDeck.client_info;
  const loanOfficerInfo = pitchDeck.loan_officer_info;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold">{pitchDeck?.title}</h1>
            {clientInfo?.name && (
              <p className="text-lg text-gray-600 mt-1">Prepared for: {clientInfo.name}</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="gap-2 mt-4 md:mt-0"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Downloading..." : "Download PDF"}
          </Button>
        </div>
        
        {pitchDeck?.description && (
          <p className="text-gray-600 mb-8">{pitchDeck.description}</p>
        )}
        
        {loanOfficerInfo && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Mortgage Professional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:justify-between">
                <div>
                  <p className="font-semibold text-lg">{loanOfficerInfo.name}</p>
                  {loanOfficerInfo.company && (
                    <p className="text-gray-600">{loanOfficerInfo.company}</p>
                  )}
                  {loanOfficerInfo.nmls_id && (
                    <p className="text-gray-600">NMLS# {loanOfficerInfo.nmls_id}</p>
                  )}
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  {loanOfficerInfo.phone && (
                    <p className="text-gray-700">{loanOfficerInfo.phone}</p>
                  )}
                  {loanOfficerInfo.email && (
                    <p className="text-gray-700">{loanOfficerInfo.email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {clientInfo && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p>{clientInfo.name}</p>
                </div>
                {clientInfo.email && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p>{clientInfo.email}</p>
                  </div>
                )}
                {clientInfo.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p>{clientInfo.phone}</p>
                  </div>
                )}
                {clientInfo.address && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p>{clientInfo.address}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {currentLoan && currentLoan.paymentBreakdown && (
          <PropertyInsightsSection
            propertyValue={propertyValue}
            loanBalance={currentLoan.balance}
            monthlyPayment={currentLoan.payment}
            paymentBreakdown={currentLoan.paymentBreakdown}
          />
        )}
        
        {currentLoan && proposedLoan && savings && 
         currentLoan.paymentBreakdown && proposedLoan.paymentBreakdown && (
          <LoanComparisonSection
            currentLoan={{
              ...currentLoan,
              paymentBreakdown: currentLoan.paymentBreakdown
            }}
            proposedLoan={{
              ...proposedLoan,
              balance: proposedLoan.amount,
              paymentBreakdown: proposedLoan.paymentBreakdown
            }}
            savings={savings}
          />
        )}
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Current Loan</h4>
                <div className="space-y-1">
                  {pitchDeck.mortgage_data?.currentLoan && (
                    <>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Loan Balance:</span>
                        <span>{formatCurrency(pitchDeck.mortgage_data.currentLoan.balance)}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Interest Rate:</span>
                        <span>{pitchDeck.mortgage_data.currentLoan.rate.toFixed(3)}%</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Monthly Payment:</span>
                        <span>{formatCurrency(pitchDeck.mortgage_data.currentLoan.payment)}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Term:</span>
                        <span>{pitchDeck.mortgage_data.currentLoan.term} years</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span>{pitchDeck.mortgage_data.currentLoan.type}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Proposed Loan</h4>
                <div className="space-y-1">
                  {pitchDeck.mortgage_data?.proposedLoan && (
                    <>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Loan Amount:</span>
                        <span>{formatCurrency(pitchDeck.mortgage_data.proposedLoan.amount)}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Interest Rate:</span>
                        <span>{pitchDeck.mortgage_data.proposedLoan.rate.toFixed(3)}%</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Monthly Payment:</span>
                        <span>{formatCurrency(pitchDeck.mortgage_data.proposedLoan.payment)}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Term:</span>
                        <span>{pitchDeck.mortgage_data.proposedLoan.term} years</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span>{pitchDeck.mortgage_data.proposedLoan.type}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {pitchDeck.mortgage_data?.savings && (
                <>
                  <div className="border rounded-lg p-4 text-center bg-green-50">
                    <p className="text-sm text-gray-600">Monthly Savings</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(pitchDeck.mortgage_data.savings.monthly)}
                    </p>
                  </div>
                  <div className="border rounded-lg p-4 text-center bg-green-50">
                    <p className="text-sm text-gray-600">Lifetime Savings</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(pitchDeck.mortgage_data.savings.lifetime)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Loan Comparison</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {pitchDeck.mortgage_data?.currentLoan && pitchDeck.mortgage_data?.proposedLoan && (
                    <>
                      <tr>
                        <td className="border px-4 py-2 font-medium">Principal</td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(pitchDeck.mortgage_data.currentLoan.balance)}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(pitchDeck.mortgage_data.proposedLoan.amount)}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(
                            pitchDeck.mortgage_data.proposedLoan.amount - 
                            pitchDeck.mortgage_data.currentLoan.balance
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2 font-medium">Interest Rate</td>
                        <td className="border px-4 py-2 text-right">
                          {pitchDeck.mortgage_data.currentLoan.rate.toFixed(3)}%
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {pitchDeck.mortgage_data.proposedLoan.rate.toFixed(3)}%
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {(
                            pitchDeck.mortgage_data.proposedLoan.rate - 
                            pitchDeck.mortgage_data.currentLoan.rate
                          ).toFixed(3)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2 font-medium">Monthly Payment</td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(pitchDeck.mortgage_data.currentLoan.payment)}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(pitchDeck.mortgage_data.proposedLoan.payment)}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {formatCurrency(
                            pitchDeck.mortgage_data.proposedLoan.payment - 
                            pitchDeck.mortgage_data.currentLoan.payment
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="border px-4 py-2 font-medium">Term (years)</td>
                        <td className="border px-4 py-2 text-right">
                          {pitchDeck.mortgage_data.currentLoan.term}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {pitchDeck.mortgage_data.proposedLoan.term}
                        </td>
                        <td className="border px-4 py-2 text-right">
                          {
                            pitchDeck.mortgage_data.proposedLoan.term - 
                            pitchDeck.mortgage_data.currentLoan.term
                          }
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        <DocumentUploadSection pitchDeckId={pitchDeck.id} />
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            This mortgage comparison was generated on {new Date(pitchDeck.created_at).toLocaleDateString()}
          </p>
          {loanOfficerInfo && (
            <div className="mt-4 pt-4 border-t">
              <p className="font-medium">Contact Your Loan Officer</p>
              <p>{loanOfficerInfo.name}</p>
              {loanOfficerInfo.phone && <p>{loanOfficerInfo.phone}</p>}
              {loanOfficerInfo.email && <p>{loanOfficerInfo.email}</p>}
              {loanOfficerInfo.nmls_id && <p>NMLS# {loanOfficerInfo.nmls_id}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YourHomeSolution;
