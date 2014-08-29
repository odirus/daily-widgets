"use strict";

require(['../../common'], function(common) {
    require(['jquery', 'bootstrap'], function($, bootstrap) {
	//初始化页面事务
	$(document).ready(function() {
	    //绑定添加食物功能
	    addNewFoodItem($);
	    //绑定添加更新菜单功能
	    updateFoodMenu($);
	});
    });
});

//添加食物条目
var addNewFoodItem = function($) {
    $('.menu-input-add').click(function() {
	var menuInputItemInstance = $('.menu-input-item-template').clone();
	
	menuInputItemInstance.attr('class', 'row menu-input-item');
	$('.menu-input-box').append(menuInputItemInstance);
    });
};
//更新菜单（需要改进）
var updateFoodMenu = function($) {
    $('.menu-input-submit').click(function() {
	var items = $('.menu-input-box').find('.item');
	var count = items.length;
	var foodMenu = {};
	
	for (var i = 3; i < count;) {
	    var foodId = $(items[i]).val();
	    
	    foodMenu[foodId] = $(items[i+1]).val() + ',' + $(items[i+2]).val();
	    i += 3;
	}
	//向服务器端更新菜单信息
	var foodCount = countObjProperties(foodMenu);
	
	if (foodCount > 0) {
	    $.ajax({
		url: "/admin/updateMenu",
		type: "POST",
		data: {
		    menu: JSON.stringify(foodMenu)
		},
		success: function(data, textStatus, jqXHR) {
		    if (textStatus === 'success') {
			alert('更新菜单成功');
		    }
		}
	    });
	}
    });
};
//计算对象自有属性数量
function countObjProperties(obj) {
    var count = 0;
    
    for (var prop in obj) {
	if (obj.hasOwnProperty(prop)) {
	    ++count;
	}
    }
    
    return count;
};

