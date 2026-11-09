from datetime import datetime, timezone
from typing import List
from app.models.trip import Trip, Invoice

class TallyIntegrationService:
    @staticmethod
    def generate_tally_xml(invoices: List[Invoice]) -> str:
        """
        Generates standard Tally Prime / Tally.ERP 9 XML Import format.
        Schema: <ENVELOPE> -> <HEADER> -> <BODY> -> <DATA> -> <TALLYMESSAGE> -> <VOUCHER VOUCHERTYPE="Sales">
        """
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        
        xml_lines = [
            '<?xml version="1.0" encoding="utf-8"?>',
            '<ENVELOPE>',
            '  <HEADER>',
            '    <TALLYREQUEST>Import Data</TALLYREQUEST>',
            '  </HEADER>',
            '  <BODY>',
            '    <IMPORTDATA>',
            '      <REQUESTDESC>',
            '        <REPORTNAME>Vouchers</REPORTNAME>',
            '      </REQUESTDESC>',
            '      <REQUESTDATA>'
        ]

        for inv in invoices:
            voucher_no = inv.tally_voucher_number or f"TL-{inv.invoice_number}"
            xml_lines.extend([
                '        <TALLYMESSAGE xmlns:UDF="TallyUDF">',
                f'          <VOUCHER VOUCHERTYPE="Sales" ACTION="Create" OBJVIEW="Accounting Voucher View">',
                f'            <DATE>{date_str}</DATE>',
                f'            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>',
                f'            <VOUCHERNUMBER>{voucher_no}</VOUCHERNUMBER>',
                f'            <REFERENCE>{inv.trip_id}</REFERENCE>',
                f'            <PARTYLEDGERNAME>{inv.client_name}</PARTYLEDGERNAME>',
                f'            <NARRATION>Freight Billing for Trip {inv.trip_id}. Attached POD: {inv.pod_image_url}</NARRATION>',
                '            <ALLLEDGERENTRIES.LIST>',
                f'              <LEDGERNAME>{inv.client_name}</LEDGERNAME>',
                '              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>',
                f'              <AMOUNT>-{inv.net_payable:.2f}</AMOUNT>',
                '            </ALLLEDGERENTRIES.LIST>',
                '            <ALLLEDGERENTRIES.LIST>',
                '              <LEDGERNAME>Freight Income Account</LEDGERNAME>',
                '              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>',
                f'              <AMOUNT>{inv.freight_amount:.2f}</AMOUNT>',
                '            </ALLLEDGERENTRIES.LIST>'
            ])

            if inv.deduction_amount > 0:
                xml_lines.extend([
                    '            <ALLLEDGERENTRIES.LIST>',
                    '              <LEDGERNAME>Shortage &amp; Damage Deductions</LEDGERNAME>',
                    '              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>',
                    f'              <AMOUNT>-{inv.deduction_amount:.2f}</AMOUNT>',
                    '            </ALLLEDGERENTRIES.LIST>'
                ])

            xml_lines.extend([
                '          </VOUCHER>',
                '        </TALLYMESSAGE>'
            ])

        xml_lines.extend([
            '      </REQUESTDATA>',
            '    </IMPORTDATA>',
            '  </BODY>',
            '</ENVELOPE>'
        ])

        return "\n".join(xml_lines)

