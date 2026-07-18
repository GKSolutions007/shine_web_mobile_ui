using ShineWebMobile.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace ShineWebMobile.Controllers
{
    public class VanLoadingSlipController : Controller
    {
        // GET: VanLoadingSlip
        public ActionResult Index(string Name, string strFormID, string TypeID, string TranID)
        {
            if (Session["LoginUserID"] == null)
            {
                return RedirectToAction("Index", "LogOn");
            }
            else
            {
                //Name = clsEncryptDecrypt.Decrypt(Name);
                //string decFormID = clsEncryptDecrypt.Decrypt(strFormID);
                ViewData["FormName"] = Name;
                DataTable dtPermission = (System.Data.DataTable)Session["dtPermission"];
                int UID = Convert.ToInt32(Session["LoginUserID"]);                
                //ViewData["FormID"] = decFormID;
                SingleMasterModel dam = new SingleMasterModel();
                dam.FormName = Name;
                dam.TransType = TypeID;
                dam.TransID = TranID;                
                return View(dam);
            }
        }
    }
}