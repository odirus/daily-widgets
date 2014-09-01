"use strict";

require(['../../common'], function(common) {
    require(['jquery', 'bootstrap'], function($, bootstrap) {
	//初始化页面事务
	$(document).ready(function() {
	    //绑定添加食物功能
	    addNewFoodItem($);
	    //绑定添加更新菜单功能
	    updateFoodMenu($);
	    //绑定添加方案卡
	    addSelectTab($);
	    //添加更新用户订单信息
	    updateAllUserOrder($);
	});
    });
});

//添加方案选项卡
var addSelectTab = function($) {
    $('#scheme-tabs a').click(function (e) {
	e.preventDefault();
	$(this).tab('show');
    });
};
//添加食物条目
var addNewFoodItem = function($) {
    $('#manual-scheme button.menu-input-add').click(function() {
	var menuInputItemInstance = $('#manual-scheme div.menu-input-item-template').clone();
	
	menuInputItemInstance.attr('class', 'row menu-input-item');
	$('#manual-scheme div.menu-input-box').append(menuInputItemInstance);
    });
};
//更新菜单（需要改进）
var updateFoodMenu = function($) {
    $('#manual-scheme button.menu-input-submit').click(function() {
	var items = $('#manual-scheme div.menu-input-box').find('.item');
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
		    scheme: 'manual',
		    menu: JSON.stringify(foodMenu)
		},
		success: function(data, textStatus, jqXHR) {
		    if (textStatus === 'success') {
			alert(data);
		    }
		}
	    });
	}
    });
    $('#zdm-scheme button.menu-input-submit').click(function() {
	var menuString = $('#zdm-scheme textarea').val();

	if (menuString.length > 0) {
	    $.ajax({
		url: "/admin/updateMenu",
		type: "POST",
		data: {
		    scheme: 'zdm',
		    menu: menuString
		},
		success: function(data, textStatus, jqXHR) {
		    if (textStatus === 'success') {
			alert(data);
		    }
		}
	    });
	}
    });
};
//更新用户订单信息
var updateAllUserOrder = function($) {
    $.ajax({
	url: "/admin/allUserOrder",
	type: "GET",
	success: function(data, textStatus, jqXHR) {
	    if (textStatus === 'success') {
		writeAllUserOrder($, data);
	    }
	}
    });
};
//渲染用户订单信息
var writeAllUserOrder = function($, allUserOrder) {
    for (var index in allUserOrder) {
	var template = $('.all-users-order tr.all-users-order-item-template').clone();
	
	template.attr('class', 'all-users-order-item');
	template.children(':nth-child(1)').text(index);
	template.children(':nth-child(2)').text(allUserOrder[index].count || 0);
	template.children(':nth-child(3)').text(allUserOrder[index].price);
	
	var orderDetail = '';
	
	for (var i in allUserOrder[index].users) {
	    orderDetail += (allUserOrder[index].users[i] + '（' + allUserOrder[index].userCount[i] + '） ');
	}
	template.children(':nth-child(4)').text(orderDetail);
	$('.all-users-order tbody').append(template);
    }
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

