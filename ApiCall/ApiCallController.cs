using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net.Http.Headers;
using System.Net.Http;
using System.Web;
using System.Web.Mvc;
using ShineWebMobile.Validations;
using System.Configuration;
using Newtonsoft.Json;

namespace ShineWebMobile.ApiCall
{
    public class ApiCallController : Controller
    {
        // GET: ApiCall
        public ActionResult Index()
        {
            return View();
        }
        public static DataTable Executeapidatatable(string APIControllerwithParameters)
        {
            DataTable dt = new DataTable();
            string APIurl = (ConfigurationManager.AppSettings["apiurl"].ToString());
            HttpClient _client = new HttpClient();
            _client.BaseAddress = new Uri(APIurl);// APILink from app config
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            HttpResponseMessage result = _client.GetAsync(APIControllerwithParameters).Result;
            if (result.IsSuccessStatusCode)
            {
                var jsonString = result.Content.ReadAsStringAsync();
                string json = JsonConvert.DeserializeObject<string>(jsonString.Result);
                dt = JsonConvert.DeserializeObject<DataTable>(json);
            }
            return dt;
        }
        public static DataSet Executeapidataset(string APIControllerwithParameters)
        {
            DataSet dt = new DataSet();
            string APIurl = (ConfigurationManager.AppSettings["apiurl"].ToString());
            HttpClient _client = new HttpClient();
            _client.BaseAddress = new Uri(APIurl);// APILink from app config
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            HttpResponseMessage result = _client.GetAsync(APIControllerwithParameters).Result;
            if (result.IsSuccessStatusCode)
            {
                var jsonString = result.Content.ReadAsStringAsync();
                string json = JsonConvert.DeserializeObject<string>(jsonString.Result);
                dt = JsonConvert.DeserializeObject<DataSet>(json);
            }
            return dt;
        }
        public static DataTable ExecuteapidatatableAPIreturnlist(string APIControllerwithParameters)
        {
            DataTable dt = new DataTable();
            string APIurl = (ConfigurationManager.AppSettings["apiurl"].ToString());
            HttpClient _client = new HttpClient();
            _client.BaseAddress = new Uri(APIurl);// APILink from app config
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            HttpResponseMessage result = _client.GetAsync(APIControllerwithParameters).Result;
            if (result.IsSuccessStatusCode)
            {
                var jsonString = result.Content.ReadAsStringAsync();
                dt = JsonConvert.DeserializeObject<DataTable>(jsonString.Result);
            }
            return dt;
        }
    }
}