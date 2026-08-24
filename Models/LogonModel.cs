using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace ShineWebMobile.Models
{
    public class LogonModel
    {

        public string CompanyCodeID { get; set; }
        public IEnumerable<SelectListItem> CompanyCode { get; set; }

        //[Required(ErrorMessage = "* User Name Should not be Empty")]
        public string UserName { get; set; }

        //[Required(ErrorMessage = "* Password Should not be Empty")]
        [DataType(DataType.Password)]
        public string Password { get; set; }

        public bool RememberMe { get; set; }
        public string DeviceID { get; set; }
        public int ClsStock { get; set; }
        [DataType(DataType.Password)]
        public string PIN { get; set; }
        [DisplayName("L-PIN")]
        public bool UsingPIN { get; set; }
        [DisplayName("User Name/Password")]
        public bool UsingUNPWD { get; set; }
    }
    public class SingleMasterModel
    {
        public string ID { get; set; }
        public string Name { get; set; }
        public string Value { get; set; }
        public string Active { get; set; }
        public string UserID { get; set; }
        public string Mode { get; set; }
        public string FormName { get; set; }
        public string FormID { get; set; }
        public string Add { get; set; }
        public string Modify { get; set; }
        public string Variant { get; set; }
        public string View { get; set; }
        public string Cancel { get; set; }
        public string Return { get; set; }
        public string ShowAllUserData { get; set; }
        public string EnableReturnPrice { get; set; }
        public string EnablePrice { get; set; }
        public string EnableBranch { get; set; }
        public string EnableSave { get; set; }

        public string TransType { get; set; }
        public string TransID { get; set; }
        public string ChildURL1 { get; set; }
        public string ChildURL2 { get; set; }
        public string ChildURL3 { get; set; }
        public string ChildURL4 { get; set; }
        public string ChildURL5 { get; set; }

        public string Add1 { get; set; }
        public string Modify1 { get; set; }
        public string Variant1 { get; set; }
        public string View1 { get; set; }
        public string Cancel1 { get; set; }
        public List<clspermissions> permissions { get; set; }
        public string ProductFilter { get; set; }
        public string CategoryFilter { get; set; }
        public string ManufacturerFilter { get; set; }
        public string Feedback { get; set; }
        public string NoOrder { get; set; }
        public string OrderTaken { get; set; }

        public string AssignInvoicewise { get; set; }
        public string Customerwise { get; set; }
        public string EditPartyDetail { get; set; }
        public string EditAddressDetail { get; set; }
    }
    public class clspermissions
    {
        public string PermissionName { get; set; }
        public bool HavePermission { get; set; }
    }
    public class getsetdates
    {
        public string MinDate { get; set; }
        public string MaxDate { get; set; }
        public string Value { get; set; }
    }
}