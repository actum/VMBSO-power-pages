# Invoice Flow Required Fields

The Power Automate flow that fetches invoices (endpoint: `/cloudflow/v1.0/trigger/6c50a0de-323a-f111-88b5-000d3aba4b13`) needs to return these additional fields:

## Account Information (Linked Entity)
The flow should expand the `actum_Account` navigation property and return:
- `account.accountid` - The account ID
- `account.name` - The account/company name

**OData expand syntax:**
```
$expand=actum_Account($select=accountid,name)
```

**Alias the fields in the response as:**
- `account.accountid`
- `account.name`

## Loyalty Points Field
Add the following field to the invoice select:
- `actum_loaltypointsgranted` - The number of loyalty points granted (number field)

**This field should only have a value for Credited invoices (statuscode: 182980005)**

## FetchXML Example

```xml
<fetch>
  <entity name="actum_invoice">
    <attribute name="actum_invoiceid" />
    <attribute name="actum_invoicenumber" />
    <attribute name="actum_name" />
    <attribute name="statuscode" />
    <attribute name="actum_totalamount" />
    <attribute name="actum_totalnetamount" />
    <attribute name="actum_totalvat" />
    <attribute name="actum_invoicedate" />
    <attribute name="actum_duedate" />
    <attribute name="actum_distributorname" />
    <attribute name="actum_customer" />
    <attribute name="actum_rejectionreason" />
    <attribute name="actum_sharepointfileurl" />
    <attribute name="actum_loaltypointsgranted" />
    <attribute name="createdon" />
    <order attribute="createdon" descending="true" />
    <filter>
      <condition attribute="actum_account" operator="eq" value="@{outputs('Account_ID')}" />
    </filter>
    <link-entity name="contact" from="contactid" to="actum_contact" alias="uploader" link-type="outer">
      <attribute name="fullname" />
      <attribute name="emailaddress1" />
      <attribute name="contactid" />
    </link-entity>
    <link-entity name="account" from="accountid" to="actum_account" alias="account" link-type="outer">
      <attribute name="name" />
      <attribute name="accountid" />
    </link-entity>
  </entity>
</fetch>
```

## Example Flow Response Structure

```json
{
  "actum_invoiceid": "...",
  "actum_invoicenumber": "VF25/01-15142",
  "actum_name": "Portal Invoice VF25/01-15142",
  "statuscode": 182980005,
  "actum_loaltypointsgranted": 850,
  "uploader.contactid": "...",
  "uploader.fullname": "John Doe",
  "uploader.emailaddress1": "john@example.com",
  "account.accountid": "...",
  "account.name": "Van Severen N.V."
}
```

## Current Invoice Fields Already Returned
- actum_invoiceid
- actum_invoicenumber
- actum_name
- statuscode
- actum_totalamount
- actum_totalnetamount
- actum_totalvat
- actum_invoicedate
- actum_duedate
- createdon
- actum_distributorname
- actum_customer
- actum_rejectionreason
- actum_sharepointfileurl
- uploader.contactid
- uploader.fullname
- uploader.emailaddress1

## Action Required
Update the Power Automate flow to include:
1. Expand `actum_Account` and alias as `account.*`
2. Select `actum_loaltypointsgranted` field
