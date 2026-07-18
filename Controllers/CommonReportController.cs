using ShineWebMobile.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace ShineWebMobile.Controllers
{
    public class CommonReportController : Controller
    {
        // GET: CommonReport
        public ActionResult Index(string Name, string strFormID, string TypeID, string TranID)
        {
            if (Session["LoginUserID"] == null)
            {
                return RedirectToAction("Index", "Login");
            }
            else
            {

                Name = "Reports";
                string decFormID = "0";
                TypeID = "1";// clsEncryptDecrypt.Decrypt(TypeID);
                TranID = "1";// clsEncryptDecrypt.Decrypt(TranID);

                ViewData["FormName"] = Name;
                ViewData["FormID"] = decFormID;
                SingleMasterModel dam = new SingleMasterModel();
                dam.FormName = Name;
                dam.FormID = decFormID;
                dam.ID = TranID;
                dam.TransType = TypeID;
                return View(dam);
            }
        }
    }
}